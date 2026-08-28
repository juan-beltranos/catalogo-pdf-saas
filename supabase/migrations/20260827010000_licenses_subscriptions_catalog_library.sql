-- Permanent licenses and monthly modules are independent. Existing plan values
-- remain as a compatibility mirror of lifetime_plan.
alter table public.businesses
  add column if not exists lifetime_plan text,
  add column if not exists license_edition text not null default '2026_08',
  add column if not exists license_purchased_at timestamptz;

update public.businesses
set lifetime_plan = coalesce(lifetime_plan, plan, 'basic'),
    license_purchased_at = coalesce(license_purchased_at, created_at);

alter table public.businesses alter column lifetime_plan set default 'basic';
alter table public.businesses alter column lifetime_plan set not null;
alter table public.businesses drop constraint if exists businesses_lifetime_plan_check;
alter table public.businesses add constraint businesses_lifetime_plan_check
  check (lifetime_plan in ('basic', 'pro', 'premium'));

create or replace function public.set_business_plan_from_owner()
returns trigger language plpgsql security definer set search_path = '' as $$
declare owner_plan text;
begin
  select coalesce(raw_app_meta_data ->> 'plan', 'basic') into owner_plan
    from auth.users where id = new.owner_id;
  owner_plan := case when owner_plan in ('basic','pro','premium') then owner_plan else 'basic' end;
  new.plan := owner_plan;
  new.lifetime_plan := owner_plan;
  new.license_edition := coalesce(new.license_edition, '2026_08');
  new.license_purchased_at := coalesce(new.license_purchased_at, now());
  return new;
end; $$;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.businesses(id) on delete cascade,
  status text not null default 'none' check (status in ('none','trialing','active','past_due','canceled','expired')),
  provider text, provider_customer_id text, provider_subscription_id text, provider_purchase_id text,
  current_period_start timestamptz, current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz, grace_period_ends_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.subscriptions add column if not exists provider_purchase_id text;
create unique index if not exists subscriptions_provider_purchase_id_idx
  on public.subscriptions(provider_purchase_id) where provider_purchase_id is not null;

create table if not exists public.account_feature_overrides (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  feature_key text not null,
  enabled boolean, limit_value integer,
  expires_at timestamptz, reason text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (business_id, feature_key)
);

create table if not exists public.catalogs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text not null default '',
  status text not null default 'active' check (status in ('active','archived')),
  is_primary boolean not null default false,
  template_id text not null default 'minimalist' check (template_id in ('minimalist','classic','modern')),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists catalogs_one_primary_per_business
  on public.catalogs(business_id) where is_primary;
create index if not exists catalogs_business_updated_idx on public.catalogs(business_id, updated_at desc);

create table if not exists public.catalog_products (
  catalog_id uuid not null references public.catalogs(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  sort_order integer not null default 0, included boolean not null default true,
  price_override numeric(14,2), description_override text,
  hidden_override boolean, label_override text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key (catalog_id, product_id)
);

create table if not exists public.pdf_exports (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  catalog_id uuid references public.catalogs(id) on delete set null,
  file_name text not null, storage_key text not null, file_size bigint not null default 0,
  product_count integer not null default 0, created_at timestamptz not null default now(), expires_at timestamptz
);

insert into public.catalogs (business_id, name, is_primary, template_id, settings)
select b.id, case when trim(b.name) = '' then 'Catálogo principal' else b.name end, true, b.template_id, b.settings
from public.businesses b
where not exists (select 1 from public.catalogs c where c.business_id = b.id and c.is_primary);

insert into public.catalog_products (catalog_id, product_id, sort_order)
select c.id, p.id, p.sort_order from public.catalogs c join public.products p on p.business_id = c.business_id
where c.is_primary
on conflict (catalog_id, product_id) do nothing;

create or replace function public.subscription_has_access(target_business uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.subscriptions s where s.business_id = target_business and (
      (s.status in ('active','trialing','past_due','canceled') and (s.current_period_end is null or s.current_period_end > now()))
      or s.grace_period_ends_at > now()
    )
  );
$$;

create or replace function public.owns_business(target_business uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.businesses b where b.id = target_business and b.owner_id = auth.uid());
$$;

create or replace function public.create_catalog(catalog_name text)
returns public.catalogs language plpgsql security definer set search_path = '' as $$
declare target_business uuid; created public.catalogs;
begin
  select id into target_business from public.businesses where owner_id = auth.uid();
  if target_business is null then raise exception 'Negocio no válido'; end if;
  if not public.subscription_has_access(target_business) then raise exception 'Esta función requiere una suscripción activa'; end if;
  insert into public.catalogs(business_id, name) values(target_business, trim(catalog_name)) returning * into created;
  return created;
end; $$;

create or replace function public.duplicate_catalog(source_catalog uuid, catalog_name text)
returns public.catalogs language plpgsql security definer set search_path = '' as $$
declare source public.catalogs; created public.catalogs;
begin
  select c.* into source from public.catalogs c join public.businesses b on b.id=c.business_id
    where c.id=source_catalog and b.owner_id=auth.uid();
  if source.id is null then raise exception 'Catálogo no válido'; end if;
  if not public.subscription_has_access(source.business_id) then raise exception 'Esta función requiere una suscripción activa'; end if;
  insert into public.catalogs(business_id,name,description,template_id,settings)
    values(source.business_id,trim(catalog_name),source.description,source.template_id,source.settings) returning * into created;
  insert into public.catalog_products(catalog_id,product_id,sort_order,included,price_override,description_override,hidden_override,label_override)
    select created.id,product_id,sort_order,included,price_override,description_override,hidden_override,label_override
    from public.catalog_products where catalog_id=source.id;
  return created;
end; $$;

create or replace function public.link_product_to_primary_catalog()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.catalog_products(catalog_id,product_id,sort_order)
    select id,new.id,new.sort_order from public.catalogs where business_id=new.business_id and is_primary
    on conflict do nothing;
  return new;
end; $$;
drop trigger if exists products_link_primary_catalog on public.products;
create trigger products_link_primary_catalog after insert on public.products
for each row execute function public.link_product_to_primary_catalog();

create or replace function public.protect_commercial_fields()
returns trigger language plpgsql set search_path = '' as $$
begin
  if auth.role() = 'authenticated' then
    new.plan := old.plan; new.lifetime_plan := old.lifetime_plan;
    new.license_edition := old.license_edition; new.license_purchased_at := old.license_purchased_at;
  end if;
  return new;
end; $$;
drop trigger if exists businesses_protect_plan on public.businesses;
create trigger businesses_protect_plan before update on public.businesses
for each row execute function public.protect_commercial_fields();

create or replace function public.protect_catalog_identity()
returns trigger language plpgsql set search_path = '' as $$
begin
  if auth.role() = 'authenticated' then
    new.business_id := old.business_id;
    new.is_primary := old.is_primary;
  end if;
  return new;
end; $$;
drop trigger if exists catalogs_protect_identity on public.catalogs;
create trigger catalogs_protect_identity before update on public.catalogs
for each row execute function public.protect_catalog_identity();

create or replace function public.validate_catalog_product_business()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists (
    select 1 from public.catalogs c join public.products p on p.id = new.product_id
    where c.id = new.catalog_id and c.business_id = p.business_id
  ) then raise exception 'El producto y el catálogo deben pertenecer al mismo negocio'; end if;
  return new;
end; $$;
drop trigger if exists catalog_products_validate_business on public.catalog_products;
create trigger catalog_products_validate_business before insert or update on public.catalog_products
for each row execute function public.validate_catalog_product_business();

alter table public.subscriptions enable row level security;
alter table public.account_feature_overrides enable row level security;
alter table public.catalogs enable row level security;
alter table public.catalog_products enable row level security;
alter table public.pdf_exports enable row level security;

drop policy if exists "owners read subscriptions" on public.subscriptions;
drop policy if exists "owners read feature overrides" on public.account_feature_overrides;
drop policy if exists "owners read catalogs" on public.catalogs;
drop policy if exists "subscribers update catalogs" on public.catalogs;
drop policy if exists "subscribers delete catalogs" on public.catalogs;
drop policy if exists "owners read catalog products" on public.catalog_products;
drop policy if exists "subscribers manage catalog products" on public.catalog_products;
drop policy if exists "subscribers read pdf history" on public.pdf_exports;
create policy "owners read subscriptions" on public.subscriptions for select to authenticated using (public.owns_business(business_id));
create policy "owners read feature overrides" on public.account_feature_overrides for select to authenticated using (public.owns_business(business_id));
create policy "owners read catalogs" on public.catalogs for select to authenticated using (public.owns_business(business_id));
create policy "subscribers update catalogs" on public.catalogs for update to authenticated
  using (public.owns_business(business_id) and (is_primary or public.subscription_has_access(business_id)))
  with check (public.owns_business(business_id) and (is_primary or public.subscription_has_access(business_id)));
create policy "subscribers delete catalogs" on public.catalogs for delete to authenticated
  using (public.owns_business(business_id) and not is_primary and public.subscription_has_access(business_id));
create policy "owners read catalog products" on public.catalog_products for select to authenticated using (
  exists(select 1 from public.catalogs c where c.id=catalog_id and public.owns_business(c.business_id)));
create policy "subscribers manage catalog products" on public.catalog_products for all to authenticated
  using (exists(select 1 from public.catalogs c where c.id=catalog_id and public.owns_business(c.business_id) and (c.is_primary or public.subscription_has_access(c.business_id))))
  with check (exists(select 1 from public.catalogs c where c.id=catalog_id and public.owns_business(c.business_id) and (c.is_primary or public.subscription_has_access(c.business_id))));
create policy "subscribers read pdf history" on public.pdf_exports for select to authenticated using (public.owns_business(business_id));

revoke insert, update, delete on public.subscriptions, public.account_feature_overrides from authenticated;
grant select on public.subscriptions, public.account_feature_overrides to authenticated;
grant select, update, delete on public.catalogs to authenticated;
grant select, insert, update, delete on public.catalog_products to authenticated;
grant select on public.pdf_exports to authenticated;
grant execute on function public.create_catalog(text), public.duplicate_catalog(uuid,text) to authenticated;

drop trigger if exists subscriptions_updated_at on public.subscriptions;
create trigger subscriptions_updated_at before update on public.subscriptions for each row execute function public.set_updated_at();
drop trigger if exists feature_overrides_updated_at on public.account_feature_overrides;
create trigger feature_overrides_updated_at before update on public.account_feature_overrides for each row execute function public.set_updated_at();
drop trigger if exists catalogs_updated_at on public.catalogs;
create trigger catalogs_updated_at before update on public.catalogs for each row execute function public.set_updated_at();
drop trigger if exists catalog_products_updated_at on public.catalog_products;
create trigger catalog_products_updated_at before update on public.catalog_products for each row execute function public.set_updated_at();
