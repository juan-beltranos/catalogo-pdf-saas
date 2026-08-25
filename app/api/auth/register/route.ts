import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { PlanId } from "../../../../lib/plans";

export const runtime = "nodejs";

const required = (name: string) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Falta configurar ${name}`);
  return value;
};

const tokenPlan = (token: string): PlanId | null => {
  const entries: Array<[PlanId, string | undefined]> = [
    ["basic", process.env.REGISTRATION_TOKEN_BASIC],
    ["pro", process.env.REGISTRATION_TOKEN_PRO],
    ["premium", process.env.REGISTRATION_TOKEN_PREMIUM],
  ];
  return entries.find(([, configured]) => configured?.trim() && configured.trim() === token)?.[0] ?? null;
};

export async function GET(request: NextRequest) {
  const plan = tokenPlan(request.nextUrl.searchParams.get("token")?.trim() || "");
  return plan
    ? NextResponse.json({ valid: true, plan })
    : NextResponse.json({ valid: false, error: "El enlace de compra no es válido." }, { status: 404 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    const plan = tokenPlan(token);

    if (!plan) {
      return NextResponse.json({ error: "Necesitas un enlace de compra válido para crear la cuenta." }, { status: 403 });
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: "Ingresa un correo electrónico válido." }, { status: 400 });
    }
    if (password.length < 8 || password.length > 72) {
      return NextResponse.json({ error: "La contraseña debe tener entre 8 y 72 caracteres." }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) throw new Error("Falta configurar la URL de Supabase");
    const admin = createClient(supabaseUrl, required("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { plan },
    });

    if (error) {
      const duplicate = error.status === 422 || /already|registered|exists|duplicate/i.test(error.message);
      return NextResponse.json(
        { error: duplicate ? "Ya existe una cuenta registrada con este correo." : "No fue posible crear la cuenta." },
        { status: duplicate ? 409 : Math.min(599, Math.max(400, error.status || 500)) },
      );
    }

    return NextResponse.json({ created: true, userId: data.user.id }, { status: 201 });
  } catch (error) {
    console.error("Registration route failed", error);
    return NextResponse.json({ error: "No fue posible crear la cuenta." }, { status: 500 });
  }
}
