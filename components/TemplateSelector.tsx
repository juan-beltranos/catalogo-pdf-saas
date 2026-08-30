import React from "react";
import { Check, Crown, LockKeyhole } from "lucide-react";
import type { Product, StoreInfo, TemplateId } from "../types";
import { CatalogPreview } from "./CatalogPreview";

interface TemplateOption {
  id: TemplateId;
  name: string;
  eyebrow: string;
  description: string;
  bestFor: string;
}

const templates: TemplateOption[] = [
  { id: "minimalist", name: "Editorial", eyebrow: "LIMPIO Y ORDENADO", description: "Mucho aire, lectura rápida y productos bien organizados.", bestFor: "Listas amplias y catálogos generales" },
  { id: "classic", name: "Boutique", eyebrow: "ELEGANTE Y EXCLUSIVO", description: "Tipografía refinada, tonos cálidos y presentación premium.", bestFor: "Moda, belleza, decoración y regalos" },
  { id: "modern", name: "Impacto", eyebrow: "VISUAL Y COMERCIAL", description: "Contraste fuerte, imágenes protagonistas y precios destacados.", bestFor: "Promociones, lanzamientos y redes" },
];

const pdfLayoutOptions = [
  { value: 1, label: "1 producto", description: "Máximo protagonismo" },
  { value: 2, label: "2 productos", description: "Grande y visual" },
  { value: 4, label: "4 productos", description: "Equilibrado" },
  { value: 6, label: "6 productos", description: "Más compacto" },
];

interface TemplateSelectorProps {
  selectedId: TemplateId;
  storeInfo: StoreInfo;
  products: Product[];
  onSelect: (id: TemplateId) => void;
  pdfProductsPerPage?: number;
  onPdfProductsPerPageChange?: (value: number) => void;
  advancedLayouts?: boolean;
}

const TemplatePreview = ({ id }: { id: TemplateId }) => {
  const classic = id === "classic";
  const modern = id === "modern";
  const pageClass = classic ? "bg-[#f4efe7] text-stone-900" : modern ? "bg-slate-100 text-slate-900" : "bg-white text-slate-900";
  const headerClass = classic ? "border-[#c9bba7] bg-[#f4efe7]" : modern ? "border-blue-600 bg-slate-950 text-white" : "border-blue-600 bg-white";
  const cardClass = classic ? "border-[#c9bba7] bg-[#fffdf9]" : modern ? "rounded-xl border-slate-200 bg-white shadow-md" : "border-slate-200 bg-white";
  const imageClass = classic ? "bg-[#e7ded2]" : modern ? "rounded-lg bg-gradient-to-br from-blue-100 to-indigo-200" : "bg-slate-100";
  const titleClass = classic ? "mx-auto bg-stone-700" : "bg-slate-900";

  return <div className={`h-44 overflow-hidden rounded-t-xl ${pageClass}`}>
    <div className={`flex h-12 items-center justify-between border-b-2 px-3 ${headerClass}`}>
      <div className="flex items-center gap-2"><div className={`h-7 w-7 bg-white p-1 ${modern ? "rounded-lg" : classic ? "border border-[#c9bba7]" : "rounded-md border border-slate-200"}`}><div className="h-full w-full bg-slate-300" /></div><div><div className={`h-2 w-16 rounded ${modern ? "bg-white" : classic ? "bg-stone-700" : "bg-slate-900"}`} /><div className={`mt-1 h-1 w-10 rounded ${modern ? "bg-slate-500" : "bg-slate-300"}`} /></div></div>
      <div className={`rounded-full px-2 py-1 text-[7px] font-bold ${modern ? "bg-blue-600 text-white" : classic ? "border border-stone-300 bg-white" : "bg-slate-100"}`}>WhatsApp</div>
    </div>
    <div className={`border-b px-2 py-1 text-center text-[7px] ${modern ? "border-slate-800 bg-slate-900 text-slate-300" : classic ? "border-[#d8cbbb] bg-[#fffdf9] text-stone-500" : "border-slate-100 text-slate-400"}`}>Toca un producto para pedirlo</div>
    <div className="grid grid-cols-2 gap-2 p-2">{[0, 1].map((item) => <div key={item} className={`border p-1.5 ${cardClass}`}><div className={`h-14 ${imageClass}`} /><div className={classic ? "text-center" : ""}><div className={`mt-2 h-1.5 w-14 rounded ${titleClass}`} /><div className={`mt-1 h-1 w-9 rounded ${classic ? "mx-auto bg-[#c2b4a3]" : "bg-slate-300"}`} /><div className={`mt-2 w-fit px-2 py-1 text-[7px] font-black text-white ${classic ? "mx-auto rounded-sm bg-stone-600" : modern ? "rounded-md bg-blue-600" : "rounded bg-blue-600"}`}>$ 89.900</div></div></div>)}</div>
  </div>;
};

const LiveTemplatePreview = ({ id, storeInfo, products }: { id: TemplateId; storeInfo: StoreInfo; products: Product[] }) => <div className="relative h-44 overflow-hidden rounded-t-xl bg-slate-100">
  <div className="pointer-events-none absolute left-0 top-0 origin-top-left scale-[0.4]">
    <CatalogPreview
      storeInfo={{ ...storeInfo, templateId: id, coverImage: "" }}
      products={products.slice(0, 4)}
      productsOverride={products.slice(0, 4)}
      pdfProductsPerPage={4}
      miniature
    />
  </div>
</div>;

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({ selectedId, storeInfo, products, onSelect, pdfProductsPerPage = 4, onPdfProductsPerPageChange, advancedLayouts = false }) => {
  const selectedPdfLayout = Math.min(12, Math.max(1, Math.round(Number(pdfProductsPerPage) || 4)));
  const handleCustomPdfLayout = (value: string) => onPdfProductsPerPageChange?.(Math.min(12, Math.max(1, Math.round(Number(value) || 4))));

  return <div className="space-y-8">
    <section aria-labelledby="template-title">
      <div className="mb-4"><h3 id="template-title" className="text-base font-bold text-slate-900">Elige el estilo de tu catálogo</h3><p className="mt-1 text-sm text-slate-500">Las tres opciones cambian la personalidad, composición y presentación de los productos.</p></div>
      <div className="grid gap-4 md:grid-cols-3">{templates.map((template) => {
        const selected = selectedId === template.id;
        return <button key={template.id} type="button" onClick={() => onSelect(template.id)} aria-pressed={selected} className={`relative overflow-hidden rounded-2xl border-2 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${selected ? "border-blue-600 ring-4 ring-blue-100" : "border-slate-200 hover:border-blue-300"}`}>
          {selected && <span className="absolute right-3 top-3 z-10 grid h-7 w-7 place-items-center rounded-full bg-blue-600 text-white shadow"><Check className="h-4 w-4" /></span>}
          <LiveTemplatePreview id={template.id} storeInfo={storeInfo} products={products} />
          <div className="bg-white p-4"><span className={`text-[10px] font-black tracking-[0.14em] ${template.id === "classic" ? "text-amber-700" : template.id === "modern" ? "text-blue-600" : "text-slate-500"}`}>{template.eyebrow}</span><h4 className="mt-1 text-lg font-bold text-slate-900">{template.name}</h4><p className="mt-1 min-h-10 text-xs leading-5 text-slate-500">{template.description}</p><div className="mt-3 border-t border-slate-100 pt-3 text-[11px] font-medium text-slate-500">Ideal para: <span className="text-slate-700">{template.bestFor}</span></div></div>
        </button>})}</div>
    </section>

    <section className="border-t border-slate-200 pt-6" aria-labelledby="layout-title">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 id="layout-title" className="text-base font-bold text-slate-900">Productos por página</h3><p className="mt-1 text-sm text-slate-500">Define si quieres un catálogo más visual o más compacto.</p></div>{!advancedLayouts && <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800"><Crown className="h-3.5 w-3.5" />Layouts Premium</span>}</div>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">{pdfLayoutOptions.map((option) => {
        const locked = !advancedLayouts && option.value !== 4;
        const selected = selectedPdfLayout === option.value;
        return <button key={option.value} type="button" disabled={locked} onClick={() => !locked && onPdfProductsPerPageChange?.(option.value)} className={`relative rounded-xl border-2 p-3 text-left transition ${selected ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white hover:border-blue-300"} disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-55`}><span className="block text-sm font-bold text-slate-800">{option.label}</span><span className="mt-1 block text-[11px] text-slate-500">{option.description}</span>{locked && <LockKeyhole className="absolute right-3 top-3 h-3.5 w-3.5 text-amber-500" />}</button>})}</div>
      {advancedLayouts && <label className="mt-4 block max-w-xs"><span className="mb-1 block text-xs font-semibold text-slate-500">Cantidad personalizada</span><input type="number" min={1} max={12} step={1} value={selectedPdfLayout} onChange={(event) => handleCustomPdfLayout(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>}
    </section>
  </div>;
};
