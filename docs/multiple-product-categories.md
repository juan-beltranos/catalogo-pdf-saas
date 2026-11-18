# Publicar varias categorías por producto

1. Aplicar `supabase/migrations/20261118204932_multiple_product_categories.sql` en el proyecto de Supabase que usa producción.
2. Verificar que `products.categories` existe y que los productos anteriores conservan su categoría.
3. Publicar el commit de categorías en la rama de despliegue.
4. Crear o editar un producto, agregar dos categorías, guardar y recargar. Revisar ambos filtros en el editor y en el catálogo público, y exportar cada categoría a PDF.

La migración conserva `category` como categoría principal para clientes anteriores y sincroniza ambas columnas. Los límites del plan cuentan todas las categorías distintas del negocio. Los archivos de los nuevos diseños PDF quedan fuera de esta entrega.

Pruebas locales: `npm run test:categories` y `npm run build`.
