-- Additive change: keep the original primary category for older clients.
alter table public.products add column categories text[] not null default '{}';
update public.products set categories = array[trim(category)] where trim(category) <> '';

create or replace function public.enforce_catalog_plan_limits()
returns trigger language plpgsql set search_path = '' as $$
declare
  business_plan text;
  product_count integer;
  image_count integer;
  category_count integer;
begin
  -- Serialize writes for a business before checking its distinct categories.
  perform 1 from public.businesses where id = new.business_id for update;
  -- Old clients can still write category; new clients write categories.
  if tg_op = 'INSERT' then
    if cardinality(coalesce(new.categories, '{}'::text[])) = 0 and trim(coalesce(new.category, '')) <> '' then
      new.categories := array[new.category];
    end if;
  elsif new.category is distinct from old.category and new.categories is not distinct from old.categories then
    new.categories := array[new.category];
  end if;
  select coalesce(array_agg(name order by position), '{}'::text[]) into new.categories
  from (
    select (array_agg(trim(value) order by ord))[1] as name, min(ord) as position
    from unnest(coalesce(new.categories, '{}'::text[])) with ordinality as names(value, ord)
    where trim(coalesce(value, '')) <> ''
    group by lower(trim(value))
  ) normalized;
  new.category := coalesce(new.categories[1], '');
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

  select count(distinct lower(trim(name))) into category_count
  from (
    select unnest(p.categories) as name from public.products p
    where p.business_id = new.business_id and (tg_op = 'INSERT' or p.id <> new.id)
    union all
    select unnest(new.categories)
  ) all_categories;
  if business_plan = 'basic' and category_count > 1 then raise exception 'El plan Básico admite 1 categoría'; end if;
  if business_plan = 'pro' and category_count > 10 then raise exception 'El plan Pro admite hasta 10 categorías'; end if;
  if business_plan <> 'premium' then new.featured := false; new.hidden := false; end if;
  return new;
end; $$;

comment on column public.products.categories is 'Ordered product categories; category mirrors the first entry for legacy clients.';
notify pgrst, 'reload schema';
