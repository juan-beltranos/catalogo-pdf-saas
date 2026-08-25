create extension if not exists pgcrypto;

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null default '', whatsapp text not null default '',
  whatsapp_country_code text not null default '57' check (whatsapp_country_code in ('52', '57')),
  facebook text not null default '', instagram text not null default '', additional_info text not null default '',
  color text not null default '#3b82f6', template_id text not null default 'minimalist' check (template_id in ('minimalist','classic','modern')),
  logo_url text, logo_key text, header_image_url text, header_image_key text, cover_image_url text, cover_image_key text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200), sku text not null default '',
  price numeric(14,2) not null default 0 check (price >= 0), original_price numeric(14,2),
  description text not null default '', category text not null default '', image_url text, image_key text,
  sort_order integer not null default 0, featured boolean not null default false, hidden boolean not null default false,
  quantity integer check (quantity is null or quantity >= 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create index if not exists products_business_sort_idx on public.products (business_id, sort_order);
create index if not exists products_business_category_idx on public.products (business_id, category);

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists businesses_updated_at on public.businesses;
create trigger businesses_updated_at before update on public.businesses for each row execute function public.set_updated_at();
drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at before update on public.products for each row execute function public.set_updated_at();

alter table public.businesses enable row level security;
alter table public.products enable row level security;

create policy "owners manage their business" on public.businesses for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "owners read their products" on public.products for select to authenticated
  using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid())));
create policy "owners insert their products" on public.products for insert to authenticated
  with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid())));
create policy "owners update their products" on public.products for update to authenticated
  using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid())));
create policy "owners delete their products" on public.products for delete to authenticated
  using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid())));

revoke all on public.businesses, public.products from anon;
grant select, insert, update, delete on public.businesses, public.products to authenticated;

