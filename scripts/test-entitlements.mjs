import assert from "node:assert/strict";
import { getEffectiveEntitlements, hasSubscriptionAccess } from "../lib/entitlements.ts";

const future = "2099-01-01T00:00:00.000Z";
const past = "2020-01-01T00:00:00.000Z";

const permanent = getEffectiveEntitlements("pro", null);
assert.equal(permanent.lifetimePlan, "pro");
assert.equal(permanent.canCustomizeBrand, true);
assert.equal(permanent.canCreateMultipleCatalogs, false);

const subscribed = getEffectiveEntitlements("basic", { status: "active", currentPeriodEnd: future });
assert.equal(subscribed.lifetimePlan, "basic");
assert.equal(subscribed.canCreateMultipleCatalogs, true);
assert.equal(subscribed.maxProducts, null);
assert.equal(subscribed.maxCategories, null);
assert.equal(subscribed.canCustomizeBrand, true);
assert.equal(subscribed.canImportExcel, true);
assert.equal(subscribed.canUsePremiumProductTools, true);
assert.equal(subscribed.canUseAdvancedLayouts, true);

const subscribedWithRestrictiveOverrides = getEffectiveEntitlements("pro", { status: "active", currentPeriodEnd: future }, [
  { featureKey: "maxProducts", limitValue: 200 },
  { featureKey: "maxCategories", limitValue: 10 },
  { featureKey: "canImportExcel", enabled: false },
  { featureKey: "canUseAdvancedLayouts", enabled: false },
]);
assert.equal(subscribedWithRestrictiveOverrides.maxProducts, null);
assert.equal(subscribedWithRestrictiveOverrides.maxCategories, null);
assert.equal(subscribedWithRestrictiveOverrides.canImportExcel, true);
assert.equal(subscribedWithRestrictiveOverrides.canUseAdvancedLayouts, true);

assert.equal(hasSubscriptionAccess({ status: "canceled", currentPeriodEnd: future }), true);
assert.equal(hasSubscriptionAccess({ status: "expired", currentPeriodEnd: future }), false);
assert.equal(hasSubscriptionAccess({ status: "active", currentPeriodEnd: past }), false);

const overridden = getEffectiveEntitlements("basic", null, [
  { featureKey: "canDuplicateCatalogs", enabled: true },
  { featureKey: "maxProducts", limitValue: 75 },
]);
assert.equal(overridden.canDuplicateCatalogs, true);
assert.equal(overridden.maxProducts, 75);

console.log("Entitlements: 10 assertions passed.");
