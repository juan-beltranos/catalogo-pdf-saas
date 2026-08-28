# Catálogo Instantáneo

Aplicación Next.js para administrar productos y generar catálogos PDF. Supabase proporciona autenticación y PostgreSQL con Row Level Security. Cloudflare R2 almacena las imágenes mediante cargas directas con URLs firmadas.

## Arquitectura

- Next.js App Router sirve la interfaz y la API privada.
- Supabase Auth administra registro, inicio/cierre de sesión y recuperación de contraseña.
- Supabase PostgreSQL almacena negocios y productos con aislamiento por propietario.
- `POST /api/assets` valida el token de Supabase y firma cargas o eliminaciones en R2.
- El navegador sube directamente a R2; los bytes no pasan por el servidor Next.js.
- Los PDF se generan localmente y solo se descargan, evitando almacenamiento innecesario.

## Configuración local

1. Instala dependencias con `npm install`.
2. Copia `.env.example` como `.env.local` y completa sus valores. Los nombres antiguos `VITE_PUBLIC_SUPABASE_URL` y `VITE_PUBLIC_SUPABASE_ANON_KEY` siguen siendo compatibles.
3. Aplica la migración `supabase/migrations/20260825000000_catalog_schema.sql` desde Supabase SQL Editor o CLI.
4. Conecta un dominio personalizado público al bucket R2.
5. Define `APP_ORIGIN` con el dominio de producción y ejecuta `npm run configure:r2-cors`. Esto habilita las cargas directas desde producción y localhost.
6. Configura en Supabase Auth las URLs permitidas para desarrollo y producción.
7. Crea los enlaces comerciales en `public.registration_tokens` desde el Table Editor de Supabase. Comparte enlaces con el formato `https://tu-dominio.com/?token=TOKEN_DEL_PLAN`.
8. Ejecuta `npm run dev` y abre `http://localhost:3000`.

## Planes y registro

El registro solo se habilita al abrir un enlace con un token válido. El servidor consulta `public.registration_tokens` y asigna la versión permanente comprada en `app_metadata`. El token no controla la suscripción. El navegador no puede elegir ni modificar el plan. Básico admite 20 productos y una categoría, Pro admite 200 productos y 10 categorías, y Premium no tiene límites. Las migraciones refuerzan estos límites directamente en PostgreSQL.

Ejemplo de token administrable desde la base de datos:

```sql
insert into public.registration_tokens
  (token_value, label, plan)
values
  ('TOKEN-SEGURO-DE-VENTA-001', 'Licencia Pro', 'pro');
```

Puedes cambiar `plan`, `enabled`, `expires_at` o `max_uses` directamente desde el Table Editor. La suscripción se administra por separado en `public.subscriptions`. Mientras está activa concede todas las funciones, productos, categorías, imágenes y catálogos ilimitados. Cuando vence, la cuenta vuelve automáticamente a la versión permanente comprada. Los tres tokens antiguos de variables de entorno siguen funcionando temporalmente como compatibilidad.

Para cambiar el plan de un cliente después de la compra, edita `lifetime_plan` (o la columna compatible `plan`) en su fila de `public.businesses` desde el Table Editor de Supabase. Los valores válidos son `basic`, `pro` y `premium`; la migración mantiene ambas columnas sincronizadas. El cambio se refleja cuando el cliente recarga la aplicación y una sesión normal no puede modificar esos campos.

## Producción

Ejecuta `npm run build` y despliega el proyecto en un proveedor compatible con Next.js, como Vercel. Registra allí todas las variables de `.env.example`. Las variables R2 y `SUPABASE_SERVICE_ROLE_KEY` nunca deben usar el prefijo `NEXT_PUBLIC_`.

La ruta de archivos acepta imágenes de hasta 5 MB y PDF de hasta 25 MB, crea claves aisladas por usuario y genera URLs firmadas válidas durante cinco minutos. Configura caché de larga duración en el dominio personalizado R2 porque cada imagen utiliza una clave única.

Si el bucket todavía no tiene CORS aplicado, la aplicación utiliza temporalmente una carga autenticada a través de Next.js para evitar bloquear al usuario. Al configurar CORS, las cargas vuelven automáticamente al flujo directo de menor costo.

## Migración desde la versión local

Si una cuenta aún no tiene productos, la primera sesión importa los datos existentes de `localStorage` e IndexedDB, sube las imágenes a R2 y guarda los registros en Supabase. La copia local se conserva como respaldo.
# catalogo-pdf-saas

## Licencias permanentes y suscripcion

`lifetime_plan` representa la compra permanente (`basic`, `pro` o `premium`). La
suscripcion mensual vive por separado en `public.subscriptions`: suma modulos,
pero nunca reemplaza ni reduce la licencia. `license_edition` conserva la edicion
comercial adquirida y `account_feature_overrides` permite excepciones de soporte.

Mientras no exista una pasarela de pago, la suscripcion se administra solamente
desde el SQL Editor de Supabase con privilegios administrativos:

```sql
insert into public.subscriptions (business_id, status, current_period_start, current_period_end)
values ('BUSINESS_UUID', 'active', now(), now() + interval '1 month')
on conflict (business_id) do update set
  status = 'active', current_period_start = now(),
  current_period_end = now() + interval '1 month',
  cancel_at_period_end = false, canceled_at = null;
```

Para cancelar al final del periodo, establece `cancel_at_period_end = true` y
conserva `current_period_end`. Al expirar, los catalogos adicionales permanecen
guardados en modo lectura. Una pasarela futura debe actualizar esta tabla desde
un Route Handler que valide la firma del webhook y use `SUPABASE_SERVICE_ROLE_KEY`.

La migracion `20260827010000_licenses_subscriptions_catalog_library.sql` crea un
catalogo principal para cada negocio existente y relaciona sus productos sin
duplicarlos. Las cuentas nuevas reciben `lifetime_plan` desde el mismo token de
registro que asigna la licencia permanente.

### API de suscripciones

`POST /api/subscriptions` busca la cuenta por `email`. Sin `action`, activa 30
dias. `purchaseId` es opcional y permite relacionar la operacion con una compra:

```json
{
  "email": "cliente@ejemplo.com",
  "purchaseId": "COMPRA-123"
}
```

El request debe incluir `x-subscription-admin-token` con el valor privado de
`SUBSCRIPTION_ADMIN_TOKEN`. Las acciones opcionales son `activate`, `cancel`,
`expire` y `grant_grace`. Nunca envies este token desde el navegador.
