import { requireStoreAdmin, adminFailure, adminJson, AdminError } from "../../../../../../lib/admin-server";
import { DEFAULT_WA_COUNTRY, isWaCountryCode } from "../../../../../../helper/social";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const db = await requireStoreAdmin(request);
    const { id } = await context.params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new AdminError("Tienda no válida.", 400);
    const business = await db.from("businesses").select("*").eq("id", id).maybeSingle();
    if (business.error) throw business.error;
    if (!business.data) throw new AdminError("Tienda no encontrada.", 404);
    let query = db.from("catalogs").select("id,name,is_primary,settings,template_id").eq("business_id", id);
    const catalogId = new URL(request.url).searchParams.get("catalogId");
    query = catalogId ? query.eq("id", catalogId) : query.eq("is_primary", true);
    const catalog = await query.maybeSingle();
    if (catalog.error) throw catalog.error;
    if (!catalog.data) throw new AdminError("Catálogo no encontrado.", 404);
    const row = business.data;
    const edition = catalog.data;
    // Match the workspace: PDF layout and brand settings belong to the store.
    const storeInfo = { name: row.name, whatsapp: row.whatsapp,
      whatsappCountryCode: isWaCountryCode(row.whatsapp_country_code) ? row.whatsapp_country_code : DEFAULT_WA_COUNTRY,
      facebook: row.facebook, instagram: row.instagram, additionalInfo: row.additional_info,
      color: row.color, templateId: row.template_id, logo: row.logo_url, headerImage: row.header_image_url,
      coverImage: row.cover_image_url, ...(row.settings || {}) };
    // Fetch in batches so Supabase's row cap cannot silently truncate large PDFs.
    const products = [];
    for (let offset = 0; ; offset += 500) {
      const links = await db.from("catalog_products").select("product_id,sort_order,price_override,description_override,hidden_override,products(*)")
        .eq("catalog_id", edition.id).eq("included", true).order("sort_order").order("product_id").range(offset, offset + 499);
      if (links.error) throw links.error;
      for (const link of links.data || []) {
        const product: any = Array.isArray(link.products) ? link.products[0] : link.products;
        if (!product || product.business_id !== id) continue;
        const price = edition.settings?.audience === "wholesale" ? product.wholesale_price ?? product.price : product.price;
        products.push({ id: product.id, name: product.name, sku: product.sku || "", price: Number(link.price_override ?? price),
          originalPrice: product.original_price == null ? undefined : Number(product.original_price),
          description: link.description_override ?? product.description ?? "", category: product.category, categories: product.categories,
          image: product.image_url || "", order: link.sort_order, featured: product.featured,
          hidden: link.hidden_override ?? product.hidden, quantity: product.quantity });
      }
      if ((links.data?.length || 0) < 500) break;
    }
    return adminJson({ storeInfo, products, catalogName: edition.name });
  } catch (error) { return adminFailure(error); }
}
