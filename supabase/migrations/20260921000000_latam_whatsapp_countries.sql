alter table public.businesses
  drop constraint if exists businesses_whatsapp_country_code_check;

alter table public.businesses
  add constraint businesses_whatsapp_country_code_check
  check (whatsapp_country_code in ('57','52','591','593','56','51','54'));
