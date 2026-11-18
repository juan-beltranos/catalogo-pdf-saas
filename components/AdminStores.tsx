"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Building2, Search, ShieldCheck, ArrowUpRight, MessageCircle, FileDown, RefreshCw, Loader2, ChevronLeft, ChevronRight, X, Check, Mail, Package, CalendarDays } from "lucide-react";
import { supabase } from "../lib/supabase";
import { PLANS, getPlan, type PlanId } from "../lib/plans";
import { facebookUrl, instagramUrl, normalizeWaNumber, getCurrencyForWaCountry, WA_COUNTRIES, type WaCountryCode } from "../helper/social";
import type { Product, StoreInfo } from "../types";
import { CatalogPreview } from "./CatalogPreview";
import { ExportButton } from "./ExportButton";

type StoreCatalog = { id: string; name: string; is_primary: boolean; status: string };
type AdminStore = { id: string; name: string; email: string; owner_id: string; whatsapp: string; whatsapp_country_code: WaCountryCode; logo_url: string | null; facebook: string; instagram: string; additional_info: string; lifetime_plan: PlanId; created_at: string; productCount: number; subscriptionActive: boolean; catalogs: StoreCatalog[] };
type StoreList = { stores: AdminStore[]; total: number; stats: { total: number; basic: number; pro: number; premium: number } };
type PdfData = { storeInfo: StoreInfo; products: Product[]; catalogName: string };

async function adminRequest<T>(url: string, init: RequestInit = {}): Promise<T> {
  const session = await supabase?.auth.getSession();
  const token = session?.data.session?.access_token;
  if (!token) throw new Error("Tu sesión expiró. Vuelve a iniciar sesión.");
  const response = await fetch(url, { ...init, cache: "no-store", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init.headers } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "No se pudo completar la operación.");
  return data;
}

const planTone: Record<PlanId, string> = { basic: "bg-slate-100 text-slate-600", pro: "bg-blue-50 text-blue-700", premium: "bg-violet-50 text-violet-700" };
const control = "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const action = "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40";

export function AdminStores() {
  const [data, setData] = useState<StoreList | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [selectedPlans, setSelectedPlans] = useState<Record<string, PlanId>>({});
  const [pdfStore, setPdfStore] = useState<AdminStore | null>(null);

  useEffect(() => {
    const abort = new AbortController();
    setLoading(true); setError("");
    const timer = setTimeout(() => {
      void adminRequest<StoreList>(`/api/admin/stores?${new URLSearchParams({ page: String(page), search, plan: filter, country: countryFilter })}`, { signal: abort.signal })
        .then((result) => { setData(result); setSelectedPlans({}); })
        .catch((cause) => { if (!abort.signal.aborted) setError(cause.message); })
        .finally(() => { if (!abort.signal.aborted) setLoading(false); });
    }, 300);
    return () => { clearTimeout(timer); abort.abort(); };
  }, [page, search, filter, countryFilter, revision]);

  const savePlan = async (store: AdminStore) => {
    const plan = selectedPlans[store.id];
    if (!plan || saving) return;
    setSaving(store.id); setError(""); setNotice("");
    try {
      await adminRequest("/api/admin/stores", { method: "PATCH", body: JSON.stringify({ businessId: store.id, plan }) });
      setNotice(`La versión de ${store.name || store.email} se actualizó a ${getPlan(plan).name}.`);
      setRevision((value) => value + 1);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo cambiar la versión."); }
    finally { setSaving(null); }
  };

  return <section className="space-y-6" aria-label="Administración de tiendas">
    <div className="relative overflow-hidden rounded-3xl bg-slate-950 p-6 text-white sm:p-8">
      <div className="pointer-events-none absolute -right-12 -top-24 h-72 w-72 rounded-full bg-blue-600/20 blur-3xl" />
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-blue-200"><ShieldCheck className="h-4 w-4" />Acceso exclusivo · Administrador</span>
        <button type="button" onClick={() => setRevision((value) => value + 1)} disabled={loading} className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white disabled:opacity-40"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Actualizar</button>
      </div>
      <h2 className="relative mt-6 text-3xl font-bold tracking-tight sm:text-4xl">Todas tus tiendas, <span className="text-blue-300">en un lugar.</span></h2>
      <p className="relative mt-3 max-w-xl text-sm leading-6 text-slate-400">Consulta tus clientes, administra sus versiones y descarga sus catálogos con la configuración de cada tienda.</p>
    </div>

    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {([{ key: "total", label: "Tiendas registradas", color: "text-slate-900" }, { key: "basic", label: "Versión Básico", color: "text-slate-600" }, { key: "pro", label: "Versión Pro", color: "text-blue-600" }, { key: "premium", label: "Versión Premium", color: "text-violet-600" }] as const).map((stat) => <div key={stat.key} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"><p className="text-xs font-medium text-slate-500">{stat.label}</p><p className={`mt-2 text-3xl font-bold tracking-tight ${stat.color}`}>{data?.stats[stat.key] ?? "—"}</p></div>)}
    </div>

    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <label className="relative flex-1"><span className="sr-only">Buscar por tienda o WhatsApp</span><Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Buscar tienda o número de WhatsApp…" className={`${control} w-full pl-10`} /></label>
        <select aria-label="Filtrar por versión" value={filter} onChange={(event) => { setFilter(event.target.value); setPage(1); }} className={control}><option value="">Todas las versiones</option>{Object.values(PLANS).map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select>
        <select aria-label="Filtrar por país" value={countryFilter} onChange={(event) => { setCountryFilter(event.target.value); setPage(1); }} className={control}><option value="">Todos los países</option>{WA_COUNTRIES.map((country) => <option key={country.code} value={country.code}>{country.flag} {country.name}</option>)}</select>
      </div>
      <p className="mt-3 text-xs text-slate-400">{data ? `${data.total} tienda${data.total === 1 ? "" : "s"} encontrada${data.total === 1 ? "" : "s"}` : "Cargando directorio de clientes"} · 12 por página</p>
    </div>

    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    {notice && <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"><Check className="h-4 w-4 shrink-0" />{notice}</div>}
    {loading ? <div role="status" className="flex items-center justify-center gap-3 py-20 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin text-blue-600" />Cargando tiendas…</div> : !error && data?.stores.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center"><Building2 className="mx-auto h-10 w-10 text-slate-300" /><h3 className="mt-4 font-bold">No encontramos tiendas</h3><p className="mt-2 text-sm text-slate-500">Prueba con otro nombre, número, versión o país.</p></div> : !error && <div className="grid gap-4 xl:grid-cols-2">
      {data?.stores.map((store) => {
        const catalog = store.catalogs.find((item) => item.is_primary && item.status === "active") || store.catalogs.find((item) => item.status === "active");
        const whatsapp = normalizeWaNumber(store.whatsapp, store.whatsapp_country_code);
        const draft = selectedPlans[store.id] || store.lifetime_plan;
        const country = WA_COUNTRIES.find((item) => item.code === store.whatsapp_country_code);
        return <article key={store.id} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-blue-200 hover:shadow-md">
          <div className="flex items-start gap-3 p-5 pb-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 text-blue-600">{store.logo_url ? <img src={store.logo_url} alt={`Logo de ${store.name || "tienda"}`} className="h-full w-full object-contain p-1" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : <Building2 className="h-6 w-6" />}</div>
            <div className="min-w-0 flex-1"><h3 className="break-words text-lg font-bold leading-tight text-slate-900">{store.name || "Tienda sin nombre"}</h3><p className="mt-1 flex items-start gap-1.5 break-all text-xs text-slate-500"><Mail className="mt-0.5 h-3.5 w-3.5 shrink-0" />{store.email || "Sin correo"}</p><div className="mt-3 flex flex-wrap gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${planTone[store.lifetime_plan]}`}>{getPlan(store.lifetime_plan).name}</span>{store.subscriptionActive && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Suscripción activa</span>}</div></div>
          </div>
          <div className="mx-5 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-500"><span className="flex items-center gap-1.5"><Package className="h-3.5 w-3.5" />{store.productCount} productos</span><span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{new Date(store.created_at).toLocaleDateString("es-CO")}</span><span title="País configurado en WhatsApp" className="col-span-2 flex items-center gap-2 border-t border-slate-200/70 pt-2.5 font-medium text-slate-700">{country ? <><span aria-hidden="true" className="text-lg leading-none">{country.flag}</span>{country.name}</> : "País sin configurar"}</span></div>
          <div className="space-y-2 px-5 py-4 text-xs text-slate-500"><p>WhatsApp: <span className="font-medium text-slate-700">{whatsapp ? `+${whatsapp}` : "Sin registrar"}</span></p><div className="flex flex-wrap gap-3">{store.instagram && <a href={instagramUrl(store.instagram)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Instagram ↗</a>}{store.facebook && <a href={facebookUrl(store.facebook)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Facebook ↗</a>}</div>{store.additional_info && <p className="whitespace-pre-wrap break-words leading-5">{store.additional_info}</p>}<p className="break-all text-[10px] text-slate-400">ID: {store.id}</p></div>
          <div className="mt-auto border-t border-slate-100 p-5">
            <label htmlFor={`plan-${store.id}`} className="mb-2 block text-xs font-semibold text-slate-500">Versión comprada</label>
            <div className="flex gap-2"><select id={`plan-${store.id}`} value={draft} disabled={!!saving} onChange={(event) => setSelectedPlans((current) => ({ ...current, [store.id]: event.target.value as PlanId }))} className={`${control} min-w-0 flex-1`}>{Object.values(PLANS).map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select><button type="button" onClick={() => void savePlan(store)} disabled={!!saving || draft === store.lifetime_plan} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400">{saving === store.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Guardar</button></div>
            {draft !== store.lifetime_plan && <p className="mt-2 text-xs leading-5 text-amber-700">Se aplicarán los límites de {getPlan(draft).name}. Los productos se conservan.{store.subscriptionActive && " La suscripción seguirá activa."}</p>}
            <div className="mt-4 grid grid-cols-2 gap-2">{catalog ? <a href={`/catalogo/${catalog.id}`} target="_blank" rel="noopener noreferrer" className={action}>Ver tienda<ArrowUpRight className="h-4 w-4" /></a> : <button disabled className={action}>Sin enlace activo</button>}{whatsapp ? <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className={`${action} !border-emerald-100 !text-emerald-700 hover:!bg-emerald-50`}><MessageCircle className="h-4 w-4" />WhatsApp</a> : <button disabled className={action}>Sin WhatsApp</button>}<button type="button" onClick={() => setPdfStore(store)} disabled={!store.catalogs.length} className={`${action} col-span-2`}><FileDown className="h-4 w-4" />Descargar PDF del cliente</button></div>
          </div>
        </article>;
      })}
    </div>}
    {data && data.total > 12 && <div className="flex items-center justify-between gap-3"><button type="button" className={action} disabled={page === 1 || loading} onClick={() => setPage((value) => value - 1)}><ChevronLeft className="h-4 w-4" />Anterior</button><span className="text-xs text-slate-500">{page} / {Math.ceil(data.total / 12)}</span><button type="button" className={action} disabled={page * 12 >= data.total || loading} onClick={() => setPage((value) => value + 1)}>Siguiente<ChevronRight className="h-4 w-4" /></button></div>}
    {pdfStore && <ClientPdfDialog store={pdfStore} onClose={() => setPdfStore(null)} />}
  </section>;
}

function ClientPdfDialog({ store, onClose }: { store: AdminStore; onClose: () => void }) {
  const [catalogId, setCatalogId] = useState(store.catalogs.find((item) => item.is_primary)?.id || store.catalogs[0]?.id || "");
  const [data, setData] = useState<PdfData | null>(null);
  const [error, setError] = useState("");
  const preview = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useCallback(onClose, [onClose]);
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    element?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { element?.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  useEffect(() => {
    const abort = new AbortController(); setData(null); setError("");
    void adminRequest<PdfData>(`/api/admin/stores/${store.id}/catalog?catalogId=${encodeURIComponent(catalogId)}`, { signal: abort.signal })
      .then(setData).catch((cause) => { if (!abort.signal.aborted) setError(cause.message); });
    return () => abort.abort();
  }, [store.id, catalogId]);
  return <dialog ref={dialog} onCancel={close} aria-labelledby="client-pdf-title" className="m-auto max-h-[92dvh] w-[calc(100%_-_1.5rem)] max-w-5xl overflow-y-auto rounded-2xl bg-slate-50 p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/60">
    <div className="sticky top-0 z-20 flex items-start justify-between gap-4 border-b border-slate-200 bg-white p-5"><div><h3 id="client-pdf-title" className="text-lg font-bold">PDF · {store.name || "Tienda"}</h3><p className="mt-1 text-xs text-slate-500">Diseño, precios, portada y marca de agua configurados por el cliente.</p></div><button type="button" autoFocus onClick={close} aria-label="Cerrar vista del PDF" className="rounded-lg p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
    <div className="p-4 sm:p-6"><label className="mb-4 block text-sm font-semibold">Catálogo<select value={catalogId} onChange={(event) => setCatalogId(event.target.value)} className={`${control} mt-2 block w-full`}>{store.catalogs.map((item) => <option key={item.id} value={item.id}>{item.name}{item.is_primary ? " · Principal" : ""}{item.status === "archived" ? " · Archivado" : ""}</option>)}</select></label>
      {error ? <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p> : !data ? <p role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />Preparando catálogo…</p> : <>
        <ExportButton key={catalogId} targetRef={preview} fileName={`${data.storeInfo.name || "tienda"}-${data.catalogName}`} products={data.products} businessWhatsapp={data.storeInfo.whatsapp} businessWhatsappCountryCode={data.storeInfo.whatsappCountryCode} currency={getCurrencyForWaCountry(data.storeInfo.whatsappCountryCode)} pdfProductsPerPage={data.storeInfo.pdfProductsPerPage ?? 4} coverImage={data.storeInfo.coverImage} showWatermarkInPdf={data.storeInfo.showWatermarkInPdf} watermarkLogo={data.storeInfo.logo} />
        {!data.products.filter((product) => !product.hidden).length && <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Este catálogo no tiene productos visibles.</p>}
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-200 p-2"><div className="mx-auto w-fit"><CatalogPreview previewRef={preview} storeInfo={data.storeInfo} products={data.products} pdfProductsPerPage={data.storeInfo.pdfProductsPerPage ?? 4} /></div></div>
      </>}
    </div>
  </dialog>;
}
