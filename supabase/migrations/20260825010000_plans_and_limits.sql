-- El plan solo puede asignarlo el servidor mediante auth.users.raw_app_meta_data.
alter table public.businesses
  add column if not exists plan text not null default 'basic'
  check (plan in ('basic', 'pro', 'premium'));

create or replace function public.set_business_plan_from_owner()
returns trigger language plpgsql security definer set search_path = '' as $$
declare owner_plan text;
begin
  select coalesce(raw_app_meta_data ->> 'plan', 'basic')
    into owner_plan from auth.users where id = new.owner_id;
  new.plan := case when owner_plan in ('basic', 'pro', 'premium') then owner_plan else 'basic' end;
  return new;
end; $$;

drop trigger if exists businesses_force_plan on public.businesses;
create trigger businesses_force_plan before insert on public.businesses
for each row execute function public.set_business_plan_from_owner();

update public.businesses b
set plan = case
  when u.raw_app_meta_data ->> 'plan' in ('basic', 'pro', 'premium') then u.raw_app_meta_data ->> 'plan'
  else 'basic'
end
from auth.users u where u.id = b.owner_id;

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

  select count(*), count(*) filter (where image_url is not null and image_url <> '')
    into product_count, image_count
    from public.products
    where business_id = new.business_id and (tg_op = 'INSERT' or id <> new.id);

  if tg_op = 'INSERT' and business_plan = 'basic' and product_count >= 20 then
    raise exception 'El plan Básico admite hasta 20 productos';
  end if;
  if coalesce(new.image_url, '') <> '' and business_plan = 'basic' and image_count >= 20 then
    raise exception 'El plan Básico admite hasta 20 imágenes';
  end if;
  if coalesce(new.image_url, '') <> '' and business_plan = 'pro' and image_count >= 200 then
    raise exception 'El plan Pro admite hasta 200 imágenes';
  end if;

  if coalesce(trim(new.category), '') <> '' then
    select count(distinct lower(trim(category))) into category_count
    from public.products
    where business_id = new.business_id
      and coalesce(trim(category), '') <> ''
      and lower(trim(category)) <> lower(trim(new.category))
      and (tg_op = 'INSERT' or id <> new.id);
    if business_plan = 'basic' and category_count >= 1 then
      raise exception 'El plan Básico admite 1 categoría';
    end if;
    if business_plan = 'pro' and category_count >= 10 then
      raise exception 'El plan Pro admite hasta 10 categorías';
    end if;
  end if;

  if business_plan <> 'premium' then
    new.featured := false;
    new.hidden := false;
  end if;
  return new;
end; $$;

drop trigger if exists products_enforce_plan_limits on public.products;
create trigger products_enforce_plan_limits before insert or update on public.products
for each row execute function public.enforce_catalog_plan_limits();
