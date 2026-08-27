import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const adminClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Falta configurar Supabase en el servidor.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
};

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization") || "";
    const accessToken = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
    if (!accessToken) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
    const admin = adminClient();
    const { data: authData, error: authError } = await admin.auth.getUser(accessToken);
    if (authError || !authData.user) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
    const existing = await admin.from("businesses").select("*").eq("owner_id", authData.user.id).maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data) return NextResponse.json({ business: existing.data });
    // This endpoint can be called more than once during the initial client
    // mount. Upsert makes business creation atomic when requests overlap.
    const created = await admin
      .from("businesses")
      .upsert({ owner_id: authData.user.id }, { onConflict: "owner_id" })
      .select("*")
      .single();
    if (created.error) throw created.error;
    return NextResponse.json({ business: created.data }, { status: 201 });
  } catch (cause: any) {
    console.error("Catalog bootstrap failed", cause);
    return NextResponse.json({ error: cause?.message || "No fue posible inicializar el catálogo.", code: cause?.code }, { status: 500 });
  }
}
