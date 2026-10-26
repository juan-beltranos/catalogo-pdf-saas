-- Every active catalog gets a public URL automatically; no publish toggle is needed.
alter table public.catalogs add column if not exists digital_enabled boolean not null default false;
alter table public.catalogs alter column digital_enabled set default true;
update public.catalogs set digital_enabled = true where status = 'active';

drop policy if exists "public read enabled digital catalogs" on public.catalogs;
drop policy if exists "public read enabled digital catalog products" on public.catalog_products;
drop policy if exists "public read businesses with digital catalogs" on public.businesses;
drop policy if exists "public read products in digital catalogs" on public.products;

create policy "public read active catalogs" on public.catalogs
  for select to anon, authenticated using (status = 'active');
create policy "public read active catalog products" on public.catalog_products
  for select to anon, authenticated using (
    included and exists (select 1 from public.catalogs c where c.id = catalog_id and c.status = 'active')
  );
create policy "public read businesses with active catalogs" on public.businesses
  for select to anon, authenticated using (
    exists (select 1 from public.catalogs c where c.business_id = id and c.status = 'active')
  );
create policy "public read products in active catalogs" on public.products
  for select to anon, authenticated using (
    exists (select 1 from public.catalog_products cp join public.catalogs c on c.id = cp.catalog_id
      where cp.product_id = products.id and cp.included and c.business_id = products.business_id and c.status = 'active')
  );

grant select on public.businesses, public.products, public.catalogs, public.catalog_products to anon;
