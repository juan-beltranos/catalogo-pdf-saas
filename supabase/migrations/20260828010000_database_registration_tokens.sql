-- Registration links are managed from Supabase instead of deployment env vars.
-- Only service_role may read or mutate the raw token values.
create table if not exists public.registration_tokens (
  id uuid primary key default gen_random_uuid(),
  token_value text not null unique check (char_length(trim(token_value)) >= 12),
  label text not null default '',
  plan text not null default 'basic' check (plan in ('basic','pro','premium')),
  enabled boolean not null default true,
  max_uses integer check (max_uses is null or max_uses > 0),
  used_count integer not null default 0 check (used_count >= 0),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Remove fields from the earlier draft: a purchase token identifies only the
-- permanent version. Subscription state belongs exclusively to subscriptions.
alter table public.registration_tokens
  drop column if exists includes_subscription,
  drop column if exists subscription_days;

alter table public.registration_tokens enable row level security;
revoke all on public.registration_tokens from anon, authenticated;

drop trigger if exists registration_tokens_updated_at on public.registration_tokens;
create trigger registration_tokens_updated_at before update on public.registration_tokens
for each row execute function public.set_updated_at();

create index if not exists registration_tokens_enabled_idx
  on public.registration_tokens(enabled) where enabled;

comment on table public.registration_tokens is
  'Server-only registration links. Change plan and subscription flags from the Supabase Table Editor.';
-- Keep the compatibility plan column synchronized when an administrator edits
-- either commercial plan field from the Table Editor.
create or replace function public.protect_commercial_fields()
returns trigger language plpgsql set search_path = '' as $$
begin
  if auth.role() = 'authenticated' then
    new.plan := old.plan;
    new.lifetime_plan := old.lifetime_plan;
    new.license_edition := old.license_edition;
    new.license_purchased_at := old.license_purchased_at;
  elsif new.lifetime_plan is distinct from old.lifetime_plan then
    new.plan := new.lifetime_plan;
  elsif new.plan is distinct from old.plan then
    new.lifetime_plan := new.plan;
  end if;
  return new;
end; $$;

-- An active subscription temporarily supersedes every permanent-plan limit.
-- When it expires this same trigger automatically enforces the purchased plan again.
create or replace function public.enforce_catalog_plan_limits()
returns trigger language plpgsql set search_path = '' as $$
declare
  business_plan text;
  product_count integer;
  image_count integer;
  category_count integer;
begin
  select plan into business_plan from public.businesses where id = new.business_id;
  if business_plan is null then raise exception 'Negocio no válido'; end if;
  if public.subscription_has_access(new.business_id) then return new; end if;

  select count(*), count(*) filter (where image_url is not null and image_url <> '')
    into product_count, image_count from public.products
    where business_id = new.business_id and (tg_op = 'INSERT' or id <> new.id);
  if tg_op = 'INSERT' and business_plan = 'basic' and product_count >= 20 then raise exception 'El plan Básico admite hasta 20 productos'; end if;
  if tg_op = 'INSERT' and business_plan = 'pro' and product_count >= 200 then raise exception 'El plan Pro admite hasta 200 productos'; end if;
  if coalesce(new.image_url, '') <> '' and business_plan = 'basic' and image_count >= 20 then raise exception 'El plan Básico admite hasta 20 imágenes'; end if;
  if coalesce(new.image_url, '') <> '' and business_plan = 'pro' and image_count >= 200 then raise exception 'El plan Pro admite hasta 200 imágenes'; end if;

  if coalesce(trim(new.category), '') <> '' then
    select count(distinct lower(trim(category))) into category_count from public.products
      where business_id = new.business_id and coalesce(trim(category), '') <> ''
      and lower(trim(category)) <> lower(trim(new.category)) and (tg_op = 'INSERT' or id <> new.id);
    if business_plan = 'basic' and category_count >= 1 then raise exception 'El plan Básico admite 1 categoría'; end if;
    if business_plan = 'pro' and category_count >= 10 then raise exception 'El plan Pro admite hasta 10 categorías'; end if;
  end if;
  if business_plan <> 'premium' then new.featured := false; new.hidden := false; end if;
  return new;
end; $$;

-- Every future registration must receive exactly one permanent primary catalog.
create or replace function public.create_primary_catalog_for_business()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.catalogs (business_id, name, is_primary, template_id, settings)
  values (new.id, case when trim(new.name) = '' then 'Catálogo principal' else new.name end, true, new.template_id, new.settings)
  on conflict (business_id) where is_primary do nothing;
  return new;
end; $$;

drop trigger if exists businesses_create_primary_catalog on public.businesses;
create trigger businesses_create_primary_catalog after insert on public.businesses
for each row execute function public.create_primary_catalog_for_business();

insert into public.catalogs (business_id, name, is_primary, template_id, settings)
select b.id, case when trim(b.name) = '' then 'Catálogo principal' else b.name end, true, b.template_id, b.settings
from public.businesses b
where not exists (select 1 from public.catalogs c where c.business_id = b.id and c.is_primary)
on conflict (business_id) where is_primary do nothing;

-- Example (replace the token before running):
-- insert into public.registration_tokens
--   (token_value, label, plan)
-- values
--   ('CAMBIA-ESTE-TOKEN-UNICO', 'Licencia Pro', 'pro');
