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
7. Define los tres tokens privados `REGISTRATION_TOKEN_BASIC`, `REGISTRATION_TOKEN_PRO` y `REGISTRATION_TOKEN_PREMIUM`. Comparte enlaces con el formato `https://tu-dominio.com/?token=TOKEN_DEL_PLAN`.
8. Ejecuta `npm run dev` y abre `http://localhost:3000`.

## Planes y registro

El registro solo se habilita al abrir un enlace con un token válido. El servidor asigna el plan en `app_metadata`; el navegador no puede elegirlo ni modificarlo. Básico admite 20 productos y una categoría, Pro admite 10 categorías y 200 productos con imagen, y Premium no tiene límites. La segunda migración refuerza estos límites directamente en PostgreSQL.

Para cambiar el plan de un cliente después de la compra, edita la columna `plan` de su fila en `public.businesses` desde el Table Editor de Supabase. Los valores válidos son `basic`, `pro` y `premium`. El cambio se refleja cuando el cliente recarga la aplicación; las actualizaciones hechas desde una sesión normal no pueden modificar ese campo.

## Producción

Ejecuta `npm run build` y despliega el proyecto en un proveedor compatible con Next.js, como Vercel. Registra allí todas las variables de `.env.example`. Las variables R2 y `SUPABASE_SERVICE_ROLE_KEY` nunca deben usar el prefijo `NEXT_PUBLIC_`.

La ruta de archivos acepta imágenes de hasta 5 MB y PDF de hasta 25 MB, crea claves aisladas por usuario y genera URLs firmadas válidas durante cinco minutos. Configura caché de larga duración en el dominio personalizado R2 porque cada imagen utiliza una clave única.

Si el bucket todavía no tiene CORS aplicado, la aplicación utiliza temporalmente una carga autenticada a través de Next.js para evitar bloquear al usuario. Al configurar CORS, las cargas vuelven automáticamente al flujo directo de menor costo.

## Migración desde la versión local

Si una cuenta aún no tiene productos, la primera sesión importa los datos existentes de `localStorage` e IndexedDB, sube las imágenes a R2 y guarda los registros en Supabase. La copia local se conserva como respaldo.
# catalogo-pdf-saas
