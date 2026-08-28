import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());
const base = "http://localhost:3000";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const registrationToken = process.env.REGISTRATION_TOKEN_PRO;
if (!url || !anonKey || !serviceKey || !registrationToken) throw new Error("Falta configuración para integración");
const options = { auth: { persistSession: false, autoRefreshToken: false }, realtime: { transport: WebSocket } };
const admin = createClient(url, serviceKey, options);
const email = `integration-${Date.now()}-${crypto.randomUUID().slice(0, 6)}@example.invalid`;
const password = `Integration-${crypto.randomUUID()}!`;
let userId;
let assetKey;

const json = async (response) => ({ response, body: await response.json().catch(() => ({})) });
const assert = (condition, message) => { if (!condition) throw new Error(message); };

try {
  let result = await json(await fetch(`${base}/api/auth/register`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password, token: registrationToken }),
  }));
  assert(result.response.status === 201, `Registro falló: ${result.body.error || result.response.status}`);
  userId = result.body.userId;

  const client = createClient(url, anonKey, options);
  const login = await client.auth.signInWithPassword({ email, password });
  if (login.error || !login.data.session) throw login.error || new Error("Login sin sesión");
  const authorization = `Bearer ${login.data.session.access_token}`;

  result = await json(await fetch(`${base}/api/catalog/bootstrap`, { method: "POST", headers: { authorization } }));
  assert(result.response.ok && result.body.business?.plan === "pro", `Bootstrap incorrecto: ${result.body.error || result.response.status}`);
  const primaryCatalog = await client.from("catalogs").select("id,is_primary").eq("business_id", result.body.business.id).eq("is_primary", true);
  if (primaryCatalog.error) throw primaryCatalog.error;
  assert(primaryCatalog.data.length === 1, "Bootstrap no creó exactamente un catálogo principal");

  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
  result = await json(await fetch(`${base}/api/assets`, {
    method: "POST", headers: { authorization, "content-type": "application/json" },
    body: JSON.stringify({ action: "sign-upload", kind: "product", contentType: "image/png", size: png.length }),
  }));
  assert(result.response.ok && result.body.uploadUrl && result.body.key, `Firma R2 falló: ${result.body.error || result.response.status}`);
  assetKey = result.body.key;
  const upload = await fetch(result.body.uploadUrl, { method: "PUT", headers: { "content-type": "image/png" }, body: png });
  assert(upload.ok, `Subida R2 falló: ${upload.status}`);
  const read = await fetch(`${base}/api/assets?url=${encodeURIComponent(result.body.url)}`, { headers: { authorization } });
  assert(read.ok && (await read.arrayBuffer()).byteLength === png.length, `Lectura R2 falló: ${read.status}`);
  result = await json(await fetch(`${base}/api/assets`, {
    method: "POST", headers: { authorization, "content-type": "application/json" },
    body: JSON.stringify({ action: "delete", key: assetKey }),
  }));
  assert(result.response.ok && result.body.deleted === true, `Eliminación R2 falló: ${result.body.error || result.response.status}`);
  assetKey = undefined;
  console.log("INTEGRATION_OK register login bootstrap primary-catalog plan r2-upload r2-read r2-delete");
} finally {
  if (assetKey && userId) {
    const cleanupClient = createClient(url, anonKey, options);
    const login = await cleanupClient.auth.signInWithPassword({ email, password });
    if (login.data.session) await fetch(`${base}/api/assets`, { method: "POST", headers: { authorization: `Bearer ${login.data.session.access_token}`, "content-type": "application/json" }, body: JSON.stringify({ action: "delete", key: assetKey }) }).catch(() => undefined);
  }
  if (userId) await admin.auth.admin.deleteUser(userId).catch(() => undefined);
}
