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
const createdUsers = [];
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const createOwner = async (plan) => {
  const email = `plan-${plan}-${Date.now()}-${crypto.randomUUID().slice(0, 6)}@example.invalid`;
  const password = `Plan-${crypto.randomUUID()}!`;
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { plan } });
  if (created.error || !created.data.user) throw created.error || new Error("No se creó usuario");
  createdUsers.push(created.data.user.id);
  const client = createClient(url, anonKey, options);
  const login = await client.auth.signInWithPassword({ email, password });
  if (login.error) throw login.error;
  const business = await client.from("businesses").insert({ owner_id: created.data.user.id, name: `Test ${plan}` }).select("id,plan").single();
  if (business.error) throw business.error;
  assert(business.data.plan === plan, `El negocio no heredó el plan ${plan}`);
  return { client, businessId: business.data.id };
};

const rows = (businessId, count, category, offset = 0) => Array.from({ length: count }, (_, index) => ({
  business_id: businessId, name: `Producto ${offset + index + 1}`, price: 100, category,
}));

try {
  const basic = await createOwner("basic");
  let result = await basic.client.from("products").insert(rows(basic.businessId, 1, "Categoría A"));
  if (result.error) throw result.error;
  const secondCategory = await basic.client.from("products").insert(rows(basic.businessId, 1, "Categoría B", 1));
  assert(!!secondCategory.error, "Básico permitió una segunda categoría");
  result = await basic.client.from("products").insert(rows(basic.businessId, 19, "Categoría A", 1));
  if (result.error) throw result.error;
  const basicOverflow = await basic.client.from("products").insert(rows(basic.businessId, 1, "Categoría A", 20));
  assert(!!basicOverflow.error, "Básico permitió más de 20 productos");

  const pro = await createOwner("pro");
  for (let index = 0; index < 10; index += 1) {
    result = await pro.client.from("products").insert(rows(pro.businessId, 20, `Categoría ${index + 1}`, index * 20));
    if (result.error) throw result.error;
  }
  const proOverflow = await pro.client.from("products").insert(rows(pro.businessId, 1, "Categoría 1", 200));
  assert(!!proOverflow.error, "Pro permitió más de 200 productos");
  const firstProProduct = await pro.client.from("products").select("id").eq("business_id", pro.businessId).limit(1).single();
  if (firstProProduct.error) throw firstProProduct.error;
  const proCategoryOverflow = await pro.client.from("products").update({ category: "Categoría 11" }).eq("id", firstProProduct.data.id);
  assert(!!proCategoryOverflow.error, "Pro permitió más de 10 categorías");

  const attemptedUpgrade = await pro.client.from("businesses").update({ plan: "premium" }).eq("id", pro.businessId).select("plan").single();
  if (attemptedUpgrade.error) throw attemptedUpgrade.error;
  assert(attemptedUpgrade.data.plan === "pro", "Un cliente pudo cambiar su propio plan");

  const premium = await createOwner("premium");
  for (let index = 0; index < 11; index += 1) {
    result = await premium.client.from("products").insert(rows(premium.businessId, index === 10 ? 1 : 20, `Categoría ${index + 1}`, index * 20));
    if (result.error) throw result.error;
  }
  const premiumCount = await premium.client.from("products").select("id", { count: "exact", head: true }).eq("business_id", premium.businessId);
  assert(premiumCount.count === 201, "Premium no admitió productos ilimitados");
  console.log("PLAN_LIMITS_OK basic=20/1 pro=200/10 premium=unlimited self-upgrade=blocked");
} finally {
  for (const id of createdUsers) await admin.auth.admin.deleteUser(id).catch(() => undefined);
}
