import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { DigitalCatalog } from "../../../components/DigitalCatalog";
import type { Product, StoreInfo } from "../../../types";

export const dynamic = "force-dynamic";

export default async function DigitalCatalogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  // This runs only on the server. The service key avoids relying on public
  // table policies; never pass it to the client component.
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)?.trim();
  if (!url || !key) return <CatalogMessage title="Catálogo no disponible" detail="Falta configurar la conexión de Supabase en el servidor." />;
  const db = createClient(url, key, { auth: { persistSession: false } });
  const { data: catalog, error: catalogError } = await db.from("catalogs").select("id,name,business_id,template_id,settings,is_primary")
    .eq("id", id).eq("status", "active").maybeSingle();
  if (catalogError) {
    console.error("Digital catalog lookup failed:", catalogError.message);
    return <CatalogMessage title="No se pudo cargar el catálogo" detail="Revisa la conexión del servidor con Supabase e intenta de nuevo." />;
  }
  if (!catalog) notFound();
  const [{ data: business, error: businessError }, { data: links, error: productsError }] = await Promise.all([
    db.from("businesses").select("name,whatsapp,whatsapp_country_code,facebook,instagram,additional_info,color,template_id,logo_url,header_image_url,cover_image_url,settings")
      .eq("id", catalog.business_id).maybeSingle(),
    db.from("catalog_products").select("sort_order,price_override,description_override,hidden_override,products(id,name,sku,price,original_price,description,category,image_url,sort_order,featured,hidden,quantity)")
      .eq("catalog_id", id).eq("included", true).order("sort_order"),
  ]);
  if (businessError || productsError) {
    console.error("Digital catalog data lookup failed:", businessError?.message || productsError?.message);
    return <CatalogMessage title="No se pudo cargar el catálogo" detail="Revisa la conexión del servidor con Supabase e intenta de nuevo." />;
  }
  if (!business) notFound();
  const storeInfo: StoreInfo = {
    name: business.name || "", whatsapp: business.whatsapp || "", whatsappCountryCode: business.whatsapp_country_code,
    facebook: business.facebook || "", instagram: business.instagram || "", additionalInfo: business.additional_info || "",
    color: business.color || "#3b82f6", templateId: catalog.template_id || business.template_id || "minimalist",
    logo: business.logo_url || "", headerImage: business.header_image_url || "", coverImage: business.cover_image_url || "",
    ...(business.settings || {}),
  };
  const products: Product[] = (links || []).flatMap((link: any) => {
    const row = Array.isArray(link.products) ? link.products[0] : link.products;
    if (!row) return [];
    return [{ id: row.id, name: row.name, sku: row.sku || "", price: link.price_override == null ? Number(row.price) : Number(link.price_override),
      originalPrice: row.original_price == null ? undefined : Number(row.original_price), description: link.description_override ?? row.description ?? "",
      category: row.category || "", image: row.image_url || "", order: Number(catalog.is_primary ? row.sort_order : link.sort_order) || 0, featured: row.featured,
      hidden: link.hidden_override ?? row.hidden, quantity: row.quantity == null ? undefined : Number(row.quantity) }];
  }).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return <DigitalCatalog catalogName={catalog.name} storeInfo={storeInfo} products={products} />;
}

function CatalogMessage({ title, detail }: { title: string; detail: string }) {
  return <main className="grid min-h-screen place-items-center bg-slate-50 p-6 text-center"><section className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"><h1 className="text-xl font-bold text-slate-900">{title}</h1><p className="mt-2 text-sm text-slate-600">{detail}</p></section></main>;
}
