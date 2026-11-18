import "server-only";
import { createClient } from "@supabase/supabase-js";
import { isAdminUser } from "./admin";

export class AdminError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function requireStoreAdmin(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new AdminError("Inicia sesión para continuar.", 401);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new AdminError("Falta configurar Supabase en el servidor.", 503);
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) throw new AdminError("Tu sesión expiró. Vuelve a iniciar sesión.", 401);
  if (!isAdminUser(data.user)) throw new AdminError("No tienes acceso a la administración.", 403);
  return db;
}

export function adminFailure(error: unknown) {
  if (!(error instanceof AdminError)) console.error("Store administration failed", error);
  return Response.json({ error: error instanceof AdminError ? error.message : "No se pudo completar la operación. Inténtalo nuevamente." },
    { status: error instanceof AdminError ? error.status : 500, headers: { "Cache-Control": "private, no-store" } });
}

export const adminJson = (data: unknown) => Response.json(data, { headers: { "Cache-Control": "private, no-store" } });
