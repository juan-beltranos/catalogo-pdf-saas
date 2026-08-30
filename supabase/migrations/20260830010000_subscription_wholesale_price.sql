alter table public.products
  add column if not exists wholesale_price numeric(14,2)
  check (wholesale_price is null or wholesale_price >= 0);

comment on column public.products.wholesale_price is
  'Optional wholesale price. It can only be created or changed while the business has subscription access.';

create or replace function public.enforce_wholesale_price_subscription()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (tg_op = 'INSERT' or new.wholesale_price is distinct from old.wholesale_price)
     and new.wholesale_price is not null
     and not public.subscription_has_access(new.business_id) then
    raise exception 'El precio mayorista requiere una suscripción activa';
  end if;
  return new;
end;
$$;

drop trigger if exists products_wholesale_price_subscription on public.products;
create trigger products_wholesale_price_subscription
before insert or update of wholesale_price on public.products
for each row execute function public.enforce_wholesale_price_subscription();

notify pgrst, 'reload schema';
