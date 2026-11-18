# Administración de tiendas

El módulo **Administración** aparece en el menú del editor únicamente para el UID `1f94ea95-ee97-46a6-9146-101ba69923b9` (Sebastián). El servidor verifica el token contra Supabase Auth y comprueba ese mismo UID en cada petición. No usa metadatos editables por el usuario para conceder permisos.

Incluye directorio paginado, búsqueda por nombre o WhatsApp, filtros y totales por versión, logo, correo, redes, contacto, enlaces de catálogo digital y descarga de PDF. El PDF permite elegir entre los catálogos del cliente; utiliza el generador existente, la identidad y configuración de su tienda, los productos incluidos y los ajustes de precio, descripción y visibilidad de la edición. Los precios mayoristas se respetan en los catálogos correspondientes. Los productos se consultan en lotes para evitar descargas truncadas.

Cambiar una versión actualiza `businesses.plan` y `businesses.lifetime_plan`, comprueba el resultado y conserva la suscripción y los productos. El cliente verá los nuevos permisos al recargar su editor. La lectura de imágenes de R2 permite al administrador recuperar las imágenes del cliente para generar el PDF; los permisos de escritura y eliminación siguen limitados al propietario.

No requiere migraciones. Usa las variables de Supabase y R2 que ya necesita la aplicación; `SUPABASE_SERVICE_ROLE_KEY` permanece exclusivamente en el servidor.

## Verificación

Con la aplicación local en ejecución y `.env.local` configurado:

```sh
npm run typecheck
npm run build
npm run test:admin
```

La prueba de integración comprueba acceso anónimo e inválido, rechazo de usuarios normales, identidad del administrador, consultas, filtros, cambios de versión, conservación de suscripción, bloqueo de ascenso desde el cliente, configuración y ajustes del PDF, 501 productos y aislamiento entre tiendas. Crea y elimina una cuenta de prueba; genera una sesión temporal del administrador sin enviar correos, y revoca únicamente esa sesión al terminar. No cambia versiones ni productos de clientes existentes.
