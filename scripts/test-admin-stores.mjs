import assert from "node:assert/strict";
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

nextEnv.loadEnvConfig(process.cwd());
const base = process.env.TEST_APP_ORIGIN || "http://localhost:3000";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_PUBLIC_SUPABASE_ANON_KEY;
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const db = createClient(url, key, options);
const adminId = "1f94ea95-ee97-46a6-9146-101ba69923b9";
const identity = await db.auth.admin.getUserById(adminId);
assert.ifError(identity.error);
assert.equal(identity.data.user.email, "sebastianbeltran341@gmail.com");
console.log("Admin identity verified");

const request = async (path, token, method = "GET", body) => {
  const response = await fetch(`${base}${path}`, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  return { status: response.status, cache: response.headers.get("cache-control"), data: await response.json() };
};
let testUserId;
let adminSession;
try {
  for (const [path, method] of [["/api/admin/stores", "GET"], ["/api/admin/stores", "PATCH"], [`/api/admin/stores/${crypto.randomUUID()}/catalog`, "GET"]]) {
    assert.equal((await request(path, null, method, method === "PATCH" ? {} : undefined)).status, 401);
    assert.equal((await request(path, "invalid", method, method === "PATCH" ? {} : undefined)).status, 401);
  }
  const email = `admin-test-${crypto.randomUUID()}@example.invalid`;
  const password = `Test-${crypto.randomUUID()}!`;
  const fixture = await db.auth.admin.createUser({ email, password, email_confirm: true });
  assert.ifError(fixture.error); testUserId = fixture.data.user.id;
  const client = createClient(url, publicKey, options);
  const login = await client.auth.signInWithPassword({ email, password });
  assert.ifError(login.error);
  const token = login.data.session.access_token;
  assert.equal((await request("/api/admin/stores", token)).status, 403);
  assert.equal((await request("/api/admin/stores", token, "PATCH", { businessId: crypto.randomUUID(), plan: "premium" })).status, 403);
  assert.equal((await request(`/api/admin/stores/${crypto.randomUUID()}/catalog`, token)).status, 403);
  console.log("Anonymous, invalid tokens and ordinary users denied for every endpoint");

  // Generate a local test session without sending any email or changing credentials.
  const link = await db.auth.admin.generateLink({ type: "magiclink", email: identity.data.user.email });
  assert.ifError(link.error);
  const adminClient = createClient(url, publicKey, options);
  const verified = await adminClient.auth.verifyOtp({ type: "magiclink", token_hash: link.data.properties.hashed_token });
  assert.ifError(verified.error); adminSession = verified.data.session;
  const adminToken = adminSession.access_token;
  const listing = await request("/api/admin/stores", adminToken);
  assert.equal(listing.status, 200, JSON.stringify(listing.data));
  assert.match(listing.cache, /no-store/);
  assert.ok(Array.isArray(listing.data.stores));
  assert.ok(listing.data.stores.length <= 12);
  assert.equal(listing.data.stats.total, listing.data.total);
  assert.equal((await request("/api/admin/stores?search=ZZZ-no-match-938733", adminToken)).data.total, 0);
  const filtered = await request("/api/admin/stores?plan=pro", adminToken);
  assert.equal(filtered.status, 200);
  assert.ok(filtered.data.stores.every((store) => store.lifetime_plan === "pro"));
  assert.equal((await request("/api/admin/stores", adminToken, "PATCH", { businessId: crypto.randomUUID(), plan: "owner" })).status, 400);
  assert.equal((await request("/api/admin/stores", adminToken, "PATCH", { businessId: crypto.randomUUID(), plan: "premium" })).status, 404);

  const boot = await request("/api/catalog/bootstrap", token, "POST");
  assert.ok([200, 201].includes(boot.status), JSON.stringify(boot.data));
  const businessId = boot.data.business.id;
  const product = await db.from("products").insert({ business_id: businessId, name: "Admin PDF verification", price: 42000 }).select("id").single();
  assert.ifError(product.error);
  const subscription = await db.from("subscriptions").insert({ business_id: businessId, status: "active", provider: "manual", current_period_start: new Date().toISOString(), current_period_end: new Date(Date.now() + 86400000).toISOString() }).select("*").single();
  assert.ifError(subscription.error);
  for (const plan of ["pro", "premium", "basic"]) {
    const saved = await request("/api/admin/stores", adminToken, "PATCH", { businessId, plan });
    assert.equal(saved.status, 200, JSON.stringify(saved.data));
    const readback = await db.from("businesses").select("plan,lifetime_plan").eq("id", businessId).single();
    assert.ifError(readback.error); assert.equal(readback.data.plan, plan); assert.equal(readback.data.lifetime_plan, plan);
  }
  const subscriptionAfter = await db.from("subscriptions").select("*").eq("business_id", businessId).single();
  assert.ifError(subscriptionAfter.error);
  assert.deepEqual(subscriptionAfter.data, subscription.data, "Changing the license must preserve the subscription");
  const escalation = await client.from("businesses").update({ plan: "premium", lifetime_plan: "premium" }).eq("id", businessId).select("plan,lifetime_plan").single();
  assert.ifError(escalation.error); assert.equal(escalation.data.lifetime_plan, "basic");
  const pdf = await request(`/api/admin/stores/${businessId}/catalog`, adminToken);
  assert.equal(pdf.status, 200, JSON.stringify(pdf.data));
  assert.equal(pdf.data.products[0].name, "Admin PDF verification");
  assert.equal(pdf.data.products[0].price, 42000);
  const primary = await db.from("catalogs").select("id").eq("business_id", businessId).eq("is_primary", true).single();
  assert.ifError(primary.error);
  const override = await db.from("catalog_products").update({ price_override: 25000, description_override: "Descripción del catálogo", hidden_override: true }).eq("catalog_id", primary.data.id).eq("product_id", product.data.id);
  assert.ifError(override.error);
  const configured = await db.from("businesses").update({ template_id: "modern", settings: { pdfProductsPerPage: 6, showPrices: false, showWatermarkInPdf: true } }).eq("id", businessId);
  assert.ifError(configured.error);
  const configuredPdf = await request(`/api/admin/stores/${businessId}/catalog`, adminToken);
  assert.equal(configuredPdf.data.storeInfo.templateId, "modern");
  assert.equal(configuredPdf.data.storeInfo.pdfProductsPerPage, 6);
  assert.equal(configuredPdf.data.storeInfo.showPrices, false);
  assert.equal(configuredPdf.data.products[0].price, 25000);
  assert.equal(configuredPdf.data.products[0].hidden, true);
  assert.equal(configuredPdf.data.products[0].description, "Descripción del catálogo");
  const bulk = await db.from("products").insert(Array.from({ length: 500 }, (_, index) => ({ business_id: businessId, name: `Pagination ${index}`, price: 100 })));
  assert.ifError(bulk.error);
  const largePdf = await request(`/api/admin/stores/${businessId}/catalog`, adminToken);
  assert.equal(largePdf.status, 200);
  assert.equal(largePdf.data.products.length, 501, "PDF must include every batch of products");
  assert.equal((await request(`/api/admin/stores/${businessId}/catalog?catalogId=${crypto.randomUUID()}`, adminToken)).status, 404);
  console.log(`ADMIN_STORES_OK stores=${listing.data.total} search filters plan-readback subscription-preserved self-upgrade-denied pdf-settings pdf-overrides pdf-501-products tenant-boundary`);
} finally {
  // Revoke only the test session; preserve the administrator's existing sessions.
  if (adminSession) await db.auth.admin.signOut(adminSession.access_token, "local");
  if (testUserId) { const deleted = await db.auth.admin.deleteUser(testUserId); assert.ifError(deleted.error); }
}
