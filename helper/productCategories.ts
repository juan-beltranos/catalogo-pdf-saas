import type { Product } from "../types";

/** The array is authoritative, including an explicit empty array. */
export const getProductCategories = (product: Pick<Product, "category" | "categories">): string[] => {
  const values = Array.isArray(product.categories) ? product.categories : [product.category || ""];
  const unique = new Map<string, string>();
  for (const value of values) {
    if (typeof value !== "string") continue;
    const name = value.trim();
    if (name && !unique.has(name.toLowerCase())) unique.set(name.toLowerCase(), name);
  }
  return [...unique.values()];
};

export const categoryFields = (categories: string[]) => {
  const normalized = getProductCategories({ categories });
  return { categories: normalized, category: normalized[0] || "" };
};

export const hasCategory = (product: Pick<Product, "category" | "categories">, category: string) =>
  getProductCategories(product).some((name) => name.toLowerCase() === category.trim().toLowerCase());

export const categoryCount = (products: Pick<Product, "category" | "categories">[]) =>
  new Set(products.flatMap(getProductCategories).map((name) => name.toLowerCase())).size;
