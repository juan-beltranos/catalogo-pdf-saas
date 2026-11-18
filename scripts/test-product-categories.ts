import assert from "node:assert/strict";
import { categoryCount, categoryFields, getProductCategories, hasCategory } from "../helper/productCategories";
import { groupByCategory } from "../helper/catalog";
import type { Product } from "../types";

assert.deepEqual(getProductCategories({ category: " Calzado " }), ["Calzado"]);
assert.deepEqual(getProductCategories({ category: "Anterior", categories: [] }), []);
assert.deepEqual(categoryFields([" Calzado ", "calzado", "Ofertas", " "]), {
  category: "Calzado", categories: ["Calzado", "Ofertas"],
});
const product: Product = { id: "1", name: "Zapatos", price: 10, description: "", ...categoryFields(["Calzado", "Ofertas"]) };
assert.equal(hasCategory(product, " ofertas "), true);
assert.equal(hasCategory(product, "Ropa"), false);
assert.equal(categoryCount([product, { category: "ofertas" }, { categories: ["Ropa"] }]), 3);
const groups = groupByCategory([product, { ...product, id: "2", categories: [], category: "" }]);
assert.deepEqual(groups.map(([category]) => category), ["Calzado", "Ofertas", "Sin categoría"]);
assert.equal(groups.find(([category]) => category === "Ofertas")?.[1][0].id, "1");
assert.equal(groups.find(([category]) => category === "Calzado")?.[1].length, 1);
console.log("Product categories: legacy data, normalization, removal, filters, limits and PDF groups passed.");
