import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anonKey || !serviceKey) throw new Error("Faltan variables de Supabase");
const options = { auth: { persistSession: false, autoRefreshToken: false }, realtime: { transport: WebSocket } };
const admin = createClient(url, serviceKey, options);
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const email = `subscription-${Date.now()}-${crypto.randomUUID().slice(0, 6)}@example.invalid`;
const password = `Subscription-${crypto.randomUUID()}!`;
let userId;

const rows = (businessId, count, category, offset) => Array.from({ length: count }, (_, index) => ({
  business_id: businessId, name: `Producto ${offset + index + 1}`, price: 100, category,
}));

try {
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { plan: "pro" } });
  if (created.error || !created.data.user) throw created.error || new Error("No se creó usuario");
  userId = created.data.user.id;
  const client = createClient(url, anonKey, options);
  const login = await client.auth.signInWithPassword({ email, password });
  if (login.error) throw login.error;
  const business = await client.from("businesses").insert({ owner_id: userId, name: "Lifecycle" }).select("id,plan").single();
  if (business.error) throw business.error;
  const businessId = business.data.id;
  const primary = await client.from("catalogs").select("id,is_primary").eq("business_id", businessId).eq("is_primary", true);
  if (primary.error) throw primary.error;
  assert(primary.data.length === 1, "Una cuenta nueva no recibió exactamente un catálogo principal");

  const future = new Date(Date.now() + 86_400_000).toISOString();
  const subscription = await admin.from("subscriptions").insert({ business_id: businessId, status: "active", current_period_start: new Date().toISOString(), current_period_end: future });
  if (subscription.error) throw subscription.error;
  for (let category = 1; category <= 11; category += 1) {
    const count = category === 11 ? 1 : 20;
    const inserted = await client.from("products").insert(rows(businessId, count, `Categoría ${category}`, (category - 1) * 20));
    if (inserted.error) throw new Error(`La suscripción no permitió productos/categorías ilimitados: ${inserted.error.message}`);
  }
  const extraCatalogA = await client.rpc("create_catalog", { catalog_name: "Suscripción A" });
  const extraCatalogB = await client.rpc("create_catalog", { catalog_name: "Suscripción B" });
  if (extraCatalogA.error || extraCatalogB.error) throw extraCatalogA.error || extraCatalogB.error;

  const expired = await admin.from("subscriptions").update({ status: "expired", current_period_end: new Date(Date.now() - 1000).toISOString() }).eq("business_id", businessId);
  if (expired.error) throw expired.error;
  const overflowProduct = await client.from("products").insert(rows(businessId, 1, "Categoría 1", 201));
  assert(!!overflowProduct.error, "Al expirar, Pro permitió superar 200 productos");
  const overflowCatalog = await client.rpc("create_catalog", { catalog_name: "No permitido" });
  assert(!!overflowCatalog.error, "Al expirar, Pro permitió crear otro catálogo");
  console.log("SUBSCRIPTION_LIFECYCLE_OK primary=1 active=unlimited-products/categories/catalogs expired=pro-limits");
} finally {
  if (userId) await admin.auth.admin.deleteUser(userId).catch(() => undefined);
}
