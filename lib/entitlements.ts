import { getPlan, type PlanId } from "./plans.ts";

export type SubscriptionStatus = "none" | "trialing" | "active" | "past_due" | "canceled" | "expired";

export interface SubscriptionSnapshot {
  status?: SubscriptionStatus | null;
  currentPeriodEnd?: string | null;
  gracePeriodEndsAt?: string | null;
}

export interface FeatureOverride {
  featureKey: keyof Entitlements;
  enabled?: boolean | null;
  limitValue?: number | null;
  expiresAt?: string | null;
}

export interface Entitlements {
  lifetimePlan: PlanId;
  subscriptionActive: boolean;
  maxProducts: number | null;
  maxCategories: number | null;
  maxImages: number | null;
  canCustomizeBrand: boolean;
  canImportExcel: boolean;
  canExportExcel: boolean;
  canUsePremiumProductTools: boolean;
  canUseAdvancedLayouts: boolean;
  canCreateMultipleCatalogs: boolean;
  maxCatalogs: number | null;
  canUseProductLibrary: boolean;
  canDuplicateCatalogs: boolean;
  canSavePdfHistory: boolean;
  maxStoredPdfs: number | null;
  canUseReusableTemplates: boolean;
  canUseBatchTools: boolean;
}

const isFuture = (value?: string | null, now = new Date()) => {
  if (!value) return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && time > now.getTime();
};

export const hasSubscriptionAccess = (subscription?: SubscriptionSnapshot | null, now = new Date()) => {
  if (!subscription) return false;
  if (["trialing", "active", "past_due", "canceled"].includes(subscription.status || "")) {
    return !subscription.currentPeriodEnd || isFuture(subscription.currentPeriodEnd, now);
  }
  return isFuture(subscription.gracePeriodEndsAt, now);
};

export const getEffectiveEntitlements = (
  lifetimePlan: unknown,
  subscription?: SubscriptionSnapshot | null,
  overrides: FeatureOverride[] = [],
  now = new Date(),
): Entitlements => {
  const plan = getPlan(lifetimePlan);
  const subscribed = hasSubscriptionAccess(subscription, now);
  const result: Entitlements = {
    lifetimePlan: plan.id,
    subscriptionActive: subscribed,
    maxProducts: subscribed ? null : plan.products,
    maxCategories: subscribed ? null : plan.categories,
    maxImages: subscribed ? null : plan.images,
    canCustomizeBrand: subscribed || plan.customization,
    canImportExcel: subscribed || plan.excel,
    canExportExcel: subscribed || plan.excel,
    canUsePremiumProductTools: subscribed || plan.premiumProductTools,
    canUseAdvancedLayouts: subscribed || plan.advancedLayouts,
    canCreateMultipleCatalogs: subscribed,
    maxCatalogs: subscribed ? null : 1,
    canUseProductLibrary: subscribed,
    canDuplicateCatalogs: subscribed,
    canSavePdfHistory: subscribed,
    maxStoredPdfs: subscribed ? 100 : 0,
    canUseReusableTemplates: subscribed,
    canUseBatchTools: subscribed,
  };

  // Subscription is the highest access tier. Permanent-plan limits and account
  // overrides must never reduce it; they apply again automatically on expiry.
  if (subscribed) return result;

  for (const override of overrides) {
    if (override.expiresAt && !isFuture(override.expiresAt, now)) continue;
    const key = override.featureKey;
    if (!(key in result)) continue;
    if (typeof result[key] === "boolean" && override.enabled !== null && override.enabled !== undefined) {
      (result[key] as boolean) = override.enabled;
    } else if ((typeof result[key] === "number" || result[key] === null) && override.limitValue !== undefined) {
      (result[key] as number | null) = override.limitValue;
    }
  }
  return result;
};

export const hasFeature = (entitlements: Entitlements, feature: keyof Entitlements) =>
  entitlements[feature] === true;

export const getFeatureLimit = (entitlements: Entitlements, feature: keyof Entitlements) => {
  const value = entitlements[feature];
  return typeof value === "number" || value === null ? value : undefined;
};
