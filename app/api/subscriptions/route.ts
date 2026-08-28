import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getEffectiveEntitlements } from "../../../lib/entitlements.ts";

export const runtime = "nodejs";

const adminClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Falta configurar Supabase en el servidor.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
};

const safeTokenMatch = (provided: string, expected: string) => {
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
};

const requireAdmin = (request: NextRequest) => {
  const expected = process.env.SUBSCRIPTION_ADMIN_TOKEN?.trim() || "";
  const provided = request.headers.get("x-subscription-admin-token")?.trim() || "";
  return Boolean(expected && provided && safeTokenMatch(provided, expected));
};

const parseDate = (value: unknown) => {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const resolveBusinessId = async (
  admin: ReturnType<typeof adminClient>,
  body: Record<string, unknown>,
) => {
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) return null;
  // Email lookup is intended for manual administration. Payment webhooks should
  // persist and send businessId instead of scanning the Auth user directory.
  for (let page = 1; page <= 10; page += 1) {
    const users = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (users.error) throw users.error;
    const authUsers = users.data.users as Array<{ id: string; email?: string }>;
    const user = authUsers.find((candidate) => candidate.email?.toLowerCase() === email);
    if (user) {
      const business = await admin.from("businesses").select("id").eq("owner_id", user.id).maybeSingle();
      if (business.error) throw business.error;
      return business.data?.id || null;
    }
    if (authUsers.length < 1000) break;
  }
  return null;
};

export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization") || "";
    const accessToken = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
    if (!accessToken) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
    const admin = adminClient();
    const authenticated = await admin.auth.getUser(accessToken);
    if (authenticated.error || !authenticated.data.user) {
      return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
    }
    const business = await admin.from("businesses").select("id,lifetime_plan,plan,license_edition,license_purchased_at")
      .eq("owner_id", authenticated.data.user.id).maybeSingle();
    if (business.error) throw business.error;
    if (!business.data) return NextResponse.json({ error: "Negocio no encontrado." }, { status: 404 });
    const [subscription, overrides] = await Promise.all([
      admin.from("subscriptions").select("status,provider,current_period_start,current_period_end,cancel_at_period_end,canceled_at,grace_period_ends_at")
        .eq("business_id", business.data.id).maybeSingle(),
      admin.from("account_feature_overrides").select("feature_key,enabled,limit_value,expires_at").eq("business_id", business.data.id),
    ]);
    if (subscription.error) throw subscription.error;
    if (overrides.error) throw overrides.error;
    const snapshot = subscription.data ? {
      status: subscription.data.status,
      currentPeriodEnd: subscription.data.current_period_end,
      gracePeriodEndsAt: subscription.data.grace_period_ends_at,
    } : null;
    const entitlements = getEffectiveEntitlements(business.data.lifetime_plan || business.data.plan, snapshot, (overrides.data || []).map((item) => ({
      featureKey: item.feature_key as any, enabled: item.enabled, limitValue: item.limit_value, expiresAt: item.expires_at,
    })));
    return NextResponse.json({
      businessId: business.data.id,
      license: { plan: business.data.lifetime_plan || business.data.plan, edition: business.data.license_edition, purchasedAt: business.data.license_purchased_at },
      subscription: subscription.data || { status: "none" },
      entitlements,
    });
  } catch (cause) {
    console.error("Subscription status failed", cause);
    return NextResponse.json({ error: "No fue posible consultar la suscripción." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!requireAdmin(request)) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  try {
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "Cuerpo JSON no válido." }, { status: 400 });
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: "Debes enviar un correo electrónico válido." }, { status: 400 });
    }
    const action = typeof body.action === "string" && body.action ? body.action : "activate";
    if (!["activate", "cancel", "expire", "grant_grace"].includes(action)) {
      return NextResponse.json({ error: "Acción no válida." }, { status: 400 });
    }
    const admin = adminClient();
    const businessId = await resolveBusinessId(admin, body);
    if (!businessId) return NextResponse.json({ error: "Negocio no encontrado." }, { status: 404 });
    const existing = await admin.from("subscriptions").select("*").eq("business_id", businessId).maybeSingle();
    if (existing.error) throw existing.error;
    const now = new Date();
    const durationDays = Math.min(366, Math.max(1, Math.round(Number(body.durationDays) || 30)));
    const explicitEnd = parseDate(body.currentPeriodEnd);
    const generatedEnd = new Date(now.getTime() + durationDays * 86_400_000).toISOString();
    let values: Record<string, unknown>;
    if (action === "activate") {
      values = { business_id: businessId, status: "active", provider: typeof body.provider === "string" ? body.provider.slice(0, 50) : "manual",
        provider_purchase_id: typeof body.purchaseId === "string" && body.purchaseId.trim() ? body.purchaseId.trim().slice(0, 200) : null,
        current_period_start: now.toISOString(), current_period_end: explicitEnd || generatedEnd, cancel_at_period_end: false,
        canceled_at: null, grace_period_ends_at: null };
    } else if (action === "cancel") {
      values = { business_id: businessId, status: "canceled", cancel_at_period_end: true, canceled_at: now.toISOString(),
        current_period_end: existing.data?.current_period_end || explicitEnd || now.toISOString() };
    } else if (action === "grant_grace") {
      values = { business_id: businessId, status: existing.data?.status || "past_due",
        grace_period_ends_at: explicitEnd || generatedEnd };
    } else {
      values = { business_id: businessId, status: "expired", current_period_end: now.toISOString(),
        grace_period_ends_at: null, cancel_at_period_end: false };
    }
    const saved = await admin.from("subscriptions").upsert(values, { onConflict: "business_id" }).select("*").single();
    if (saved.error) throw saved.error;
    return NextResponse.json({ ok: true, email, subscription: saved.data });
  } catch (cause) {
    console.error("Subscription mutation failed", cause);
    return NextResponse.json({ error: "No fue posible actualizar la suscripción." }, { status: 500 });
  }
}
