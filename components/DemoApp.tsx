"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, Edit3, RotateCcw, Sparkles } from "lucide-react";
import type { Product, StoreInfo, TemplateId, ViewMode } from "../types";
import { ProductManager } from "./ProductManager";
import { StoreForm } from "./StoreForm";
import { TemplateSelector } from "./TemplateSelector";
import { CatalogPreview } from "./CatalogPreview";
import { getPlan } from "../lib/plans";
import { DEFAULT_WA_COUNTRY, getCurrencyForWaCountry } from "../helper/social";
import dynamic from "next/dynamic";

const ExportButton = dynamic(() => import("./ExportButton").then((module) => module.ExportButton), { ssr: false });

const SESSION_KEY = "catalogo-demo-session-v1";
const DEMO_PRODUCT_LIMIT = 8;
const DEFAULT_STORE: StoreInfo = {
  name: "Mi tienda de ejemplo",
  whatsapp: "",
  whatsappCountryCode: DEFAULT_WA_COUNTRY,
  color: "#3b82f6",
  templateId: "minimalist",
  headerMode: "color",
  pdfProductsPerPage: 4,
  showPrices: true,
};
const DEFAULT_PRODUCTS: Product[] = [
  { id: "demo-product-1", name: "Bolso urbano", price: 89900, description: "Diseño práctico para todos los días.", category: "Destacados", order: 0 },
  { id: "demo-product-2", name: "Camiseta clásica", price: 54900, description: "Algodón suave y cómodo.", category: "Destacados", order: 1 },
  { id: "demo-product-3", name: "Termo viajero", price: 42900, description: "Mantiene tu bebida a la temperatura ideal.", category: "Destacados", order: 2 },
];

export function DemoApp() {
  const [storeInfo, setStoreInfo] = useState<StoreInfo>(DEFAULT_STORE);
  const [products, setProducts] = useState<Product[]>(DEFAULT_PRODUCTS);
  const [viewMode, setViewMode] = useState<ViewMode>("editor");
  const [activeModule, setActiveModule] = useState<"products" | "design" | "store">("products");
  const [ready, setReady] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const plan = { ...getPlan("premium"), products: DEMO_PRODUCT_LIMIT };
  const currency = getCurrencyForWaCountry(storeInfo.whatsappCountryCode);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data?.storeInfo && Array.isArray(data.products)) {
          setStoreInfo({ ...DEFAULT_STORE, ...data.storeInfo });
          setProducts(data.products);
        }
      }
    } catch { /* A blocked or full session store should not stop the demo. */ }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify({ storeInfo, products })); }
    catch { /* Keep editing available if the browser runs out of session storage. */ }
  }, [ready, storeInfo, products]);

  const resetDemo = () => {
    setStoreInfo(DEFAULT_STORE);
    setProducts(DEFAULT_PRODUCTS);
    setViewMode("editor");
    setActiveModule("products");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2">
          <div><p className="font-bold">Catálogo Instantáneo</p><p className="text-xs text-emerald-700">Demo pública · tus cambios son temporales</p></div>
          <div className="flex items-center gap-2">
            <button onClick={() => setViewMode("editor")} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${viewMode === "editor" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}><Edit3 className="h-4 w-4"/>Editor</button>
            <button onClick={() => setViewMode("preview")} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${viewMode === "preview" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}><Eye className="h-4 w-4"/>Vista previa</button>
            <button onClick={resetDemo} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50" title="Reiniciar demo"><RotateCcw className="h-4 w-4"/><span className="hidden sm:inline">Reiniciar</span></button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-5 sm:py-8">
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900"><Sparkles className="mt-0.5 h-5 w-5 shrink-0"/><p>Prueba el editor con datos de ejemplo. Lo que hagas aquí se guarda solo en esta pestaña del navegador y no modifica ninguna cuenta.</p></div>
        {viewMode === "editor" ? (
          <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
            <nav className="flex gap-2 overflow-x-auto lg:flex-col">
              {([ ["products", "Productos"], ["design", "Diseño del PDF"], ["store", "Mi tienda"] ] as const).map(([key, label]) => <button key={key} onClick={() => setActiveModule(key)} className={`whitespace-nowrap rounded-xl px-4 py-3 text-left text-sm font-semibold ${activeModule === key ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"}`}>{label}</button>)}
              <p className="hidden px-3 pt-2 text-xs text-slate-500 lg:block">Funciones Premium · hasta {DEMO_PRODUCT_LIMIT} productos.</p>
            </nav>
            <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              {activeModule === "products" && <ProductManager products={products} allProductCount={products.length} plan={plan} currency={currency} localOnly onAdd={(product) => { setProducts((items) => [product, ...items]); return true; }} onRemove={(id) => { setProducts((items) => items.filter((item) => item.id !== id)); return true; }} onRemoveAll={() => { setProducts([]); return true; }} onUpdate={(id, updates) => { setProducts((items) => items.map((item) => item.id === id ? { ...item, ...updates } : item)); return true; }} />}
              {activeModule === "design" && <><h2 className="mb-5 text-xl font-bold">Diseño del PDF</h2><TemplateSelector selectedId={storeInfo.templateId} storeInfo={storeInfo} products={products} onSelect={(templateId: TemplateId) => setStoreInfo((info) => ({ ...info, templateId }))} pdfProductsPerPage={storeInfo.pdfProductsPerPage ?? 4} onPdfProductsPerPageChange={(count) => setStoreInfo((info) => ({ ...info, pdfProductsPerPage: count }))} advancedLayouts/></>}
              {activeModule === "store" && <><h2 className="mb-5 text-xl font-bold">Mi tienda</h2><StoreForm storeInfo={storeInfo} onUpdate={(updates) => setStoreInfo((info) => ({ ...info, ...updates }))} canCustomize localOnly/></>}
            </section>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="mb-5 text-center"><h2 className="text-2xl font-bold">Vista previa · {storeInfo.name || "Mi tienda"}</h2><p className="mt-1 text-sm text-slate-500">Así verán tus clientes el catálogo.</p></div>
            {ready && <div className="mb-5"><ExportButton targetRef={previewRef} fileName={storeInfo.name || "mi-catalogo"} products={products} businessWhatsapp={storeInfo.whatsapp} businessWhatsappCountryCode={storeInfo.whatsappCountryCode} currency={currency} pdfProductsPerPage={storeInfo.pdfProductsPerPage ?? 4}/></div>}
            <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 bg-slate-200/50 p-2"><CatalogPreview storeInfo={storeInfo} products={products} previewRef={previewRef} pdfProductsPerPage={storeInfo.pdfProductsPerPage ?? 4}/></div>
          </div>
        )}
      </main>
    </div>
  );
}
