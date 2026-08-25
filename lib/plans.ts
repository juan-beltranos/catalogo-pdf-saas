export type PlanId = "basic" | "pro" | "premium";

export interface PlanLimits {
  id: PlanId;
  name: string;
  products: number | null;
  categories: number | null;
  images: number | null;
  customization: boolean;
  excel: boolean;
  premiumProductTools: boolean;
  advancedLayouts: boolean;
}

export const PLANS: Record<PlanId, PlanLimits> = {
  basic: { id: "basic", name: "Básico", products: 20, categories: 1, images: 20, customization: false, excel: false, premiumProductTools: false, advancedLayouts: false },
  pro: { id: "pro", name: "Pro", products: 200, categories: 10, images: 200, customization: true, excel: false, premiumProductTools: false, advancedLayouts: false },
  premium: { id: "premium", name: "Premium", products: null, categories: null, images: null, customization: true, excel: true, premiumProductTools: true, advancedLayouts: true },
};

export const isPlanId = (value: unknown): value is PlanId =>
  value === "basic" || value === "pro" || value === "premium";

export const getPlan = (value: unknown) => PLANS[isPlanId(value) ? value : "basic"];
