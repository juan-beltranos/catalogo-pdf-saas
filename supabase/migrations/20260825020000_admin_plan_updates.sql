-- businesses.plan es la fuente de verdad del plan. El dashboard (rol postgres)
-- y service_role pueden cambiarlo; un usuario autenticado no puede ascenderse.
drop trigger if exists businesses_force_plan on public.businesses;
create trigger businesses_force_plan before insert on public.businesses
for each row execute function public.set_business_plan_from_owner();

create or replace function public.protect_business_plan_from_clients()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select auth.role()) = 'authenticated' then
    new.plan := old.plan;
  end if;
  return new;
end; $$;

drop trigger if exists businesses_protect_plan on public.businesses;
create trigger businesses_protect_plan before update on public.businesses
for each row execute function public.protect_business_plan_from_clients();
