import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anonKey || !serviceKey) throw new Error("Faltan variables de Supabase para la prueba CRUD");

const clientOptions = { auth: { persistSession: false, autoRefreshToken: false }, realtime: { transport: WebSocket } };
const admin = createClient(url, serviceKey, clientOptions);
const suffix = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
const password = `Crud-${crypto.randomUUID()}!`;
const createdUsers = [];

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const userClient = () => createClient(url, anonKey, clientOptions);

try {
  for (const label of ["owner", "stranger"]) {
    const email = `crud-${label}-${suffix}@example.invalid`;
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error || !data.user) throw error || new Error("No se pudo crear usuario temporal");
    createdUsers.push({ id: data.user.id, email });
  }

  const owner = userClient();
  const stranger = userClient();
  assert(!(await owner.auth.signInWithPassword({ email: createdUsers[0].email, password })).error, "Falló login del propietario");
  assert(!(await stranger.auth.signInWithPassword({ email: createdUsers[1].email, password })).error, "Falló login del segundo usuario");

  const businessInsert = await owner.from("businesses").insert({ owner_id: createdUsers[0].id, name: "CRUD Test" }).select("id").single();
  if (businessInsert.error) throw businessInsert.error;
  const businessId = businessInsert.data.id;
  const productId = crypto.randomUUID();

  const createResult = await owner.from("products").insert({ id: productId, business_id: businessId, name: "Producto inicial", price: 100, quantity: 2 }).select("*").single();
  if (createResult.error) throw createResult.error;
  assert(createResult.data.name === "Producto inicial", "CREATE devolvió datos incorrectos");

  const readResult = await owner.from("products").select("*").eq("id", productId).single();
  if (readResult.error) throw readResult.error;
  assert(Number(readResult.data.price) === 100, "READ devolvió un precio incorrecto");

  const updateResult = await owner.from("products").update({ name: "Producto actualizado", price: 150, quantity: 5 }).eq("id", productId).select("*").single();
  if (updateResult.error) throw updateResult.error;
  assert(updateResult.data.name === "Producto actualizado" && Number(updateResult.data.price) === 150, "UPDATE no persistió los cambios");

  const strangerRead = await stranger.from("products").select("id").eq("id", productId);
  if (strangerRead.error) throw strangerRead.error;
  assert(strangerRead.data.length === 0, "RLS permitió leer un producto ajeno");
  const strangerUpdate = await stranger.from("products").update({ name: "Intrusión" }).eq("id", productId).select("id");
  if (strangerUpdate.error) throw strangerUpdate.error;
  assert(strangerUpdate.data.length === 0, "RLS permitió actualizar un producto ajeno");
  const strangerDelete = await stranger.from("products").delete().eq("id", productId).select("id");
  if (strangerDelete.error) throw strangerDelete.error;
  assert(strangerDelete.data.length === 0, "RLS permitió eliminar un producto ajeno");

  const verifyOwner = await owner.from("products").select("name").eq("id", productId).single();
  if (verifyOwner.error) throw verifyOwner.error;
  assert(verifyOwner.data.name === "Producto actualizado", "El producto cambió después del intento ajeno");

  const deleteResult = await owner.from("products").delete().eq("id", productId).select("id").single();
  if (deleteResult.error) throw deleteResult.error;
  const verifyDelete = await owner.from("products").select("id").eq("id", productId);
  if (verifyDelete.error) throw verifyDelete.error;
  assert(verifyDelete.data.length === 0, "DELETE no eliminó el producto");

  console.log("CRUD_OK create read update delete rls");
} finally {
  for (const user of createdUsers) await admin.auth.admin.deleteUser(user.id).catch(() => undefined);
}
