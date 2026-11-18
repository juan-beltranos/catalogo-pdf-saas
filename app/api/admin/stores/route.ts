import { requireStoreAdmin, adminFailure, adminJson, AdminError } from "../../../../lib/admin-server";
import { isPlanId } from "../../../../lib/plans";
import { hasSubscriptionAccess } from "../../../../lib/entitlements";
import { isWaCountryCode } from "../../../../helper/social";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const db = await requireStoreAdmin(request);
    const params = new URL(request.url).searchParams;
    const page = Math.max(1, Math.min(100000, Math.floor(Number(params.get("page")) || 1)));
    const search = (params.get("search") || "").replace(/[^\p{L}\p{N}\s@.+-]/gu, "").slice(0, 100).trim();
    const plan = params.get("plan");
    const country = params.get("country");
    if (country && !isWaCountryCode(country)) throw new AdminError("Selecciona un país válido.", 400);
    let query = db.from("businesses").select("id,owner_id,name,whatsapp,whatsapp_country_code,logo_url,facebook,instagram,additional_info,lifetime_plan,created_at,products(count),catalogs(id,name,is_primary,status),subscriptions(status,current_period_end,grace_period_ends_at)", { count: "exact" });
    if (search) query = query.or(`name.ilike.%${search}%,whatsapp.ilike.%${search}%`);
    if (isPlanId(plan)) query = query.eq("lifetime_plan", plan);
    if (country) query = query.eq("whatsapp_country_code", country);
    const [result, ...counts] = await Promise.all([
      query.order("created_at", { ascending: false }).order("id").range((page - 1) * 12, page * 12 - 1),
      ...[null, "basic", "pro", "premium"].map((id) => {
        const count = db.from("businesses").select("id", { count: "exact", head: true });
        return id ? count.eq("lifetime_plan", id) : count;
      }),
    ]);
    for (const item of [result, ...counts]) if (item.error) throw item.error;
    const stores = await Promise.all((result.data || []).map(async (row) => {
      const owner = await db.auth.admin.getUserById(row.owner_id);
      if (owner.error) throw owner.error;
      const subscription = Array.isArray(row.subscriptions) ? row.subscriptions[0] : row.subscriptions;
      return { ...row, email: owner.data.user.email || "", productCount: row.products?.[0]?.count || 0,
        subscriptionActive: hasSubscriptionAccess(subscription ? { status: subscription.status as any, currentPeriodEnd: subscription.current_period_end, gracePeriodEndsAt: subscription.grace_period_ends_at } : null) };
    }));
    return adminJson({ stores, total: result.count || 0, page, stats: { total: counts[0].count || 0, basic: counts[1].count || 0, pro: counts[2].count || 0, premium: counts[3].count || 0 } });
  } catch (error) { return adminFailure(error); }
}

export async function PATCH(request: Request) {
  try {
    const db = await requireStoreAdmin(request);
    const body = await request.json().catch(() => null);
    if (!body || !isPlanId(body.plan) || typeof body.businessId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.businessId)) {
      throw new AdminError("Selecciona una tienda y una versión válida.", 400);
    }
    const { data, error } = await db.from("businesses").update({ plan: body.plan, lifetime_plan: body.plan })
      .eq("id", body.businessId).select("id,plan,lifetime_plan").maybeSingle();
    if (error) throw error;
    if (!data) throw new AdminError("La tienda ya no está disponible.", 404);
    if (data.plan !== body.plan || data.lifetime_plan !== body.plan) throw new Error("Plan update was not persisted");
    return adminJson({ store: data });
  } catch (error) { return adminFailure(error); }
}
