import React, { useEffect, useMemo, useState } from "react";
import { Archive, ArrowRight, Check, Copy, Eye, FileText, LockKeyhole, Package, Pencil, Plus, Search, Store, Tags, Trash2, X } from "lucide-react";
import type { CatalogAudience, CatalogSummary, Product } from "../types";

interface Props {
  catalogs: CatalogSummary[];
  activeCatalogId: string | null;
  subscriptionActive: boolean;
  libraryProducts: Product[];
  onOpen: (id: string) => void;
  onPreview: (id: string) => Promise<void>;
  onCreate: (name: string, audience?: CatalogAudience) => Promise<boolean>;
  onDuplicate: (catalog: CatalogSummary) => Promise<boolean>;
  onArchive: (catalog: CatalogSummary) => Promise<boolean>;
  onRename: (catalog: CatalogSummary, name: string) => Promise<boolean>;
  onDelete: (catalog: CatalogSummary) => Promise<boolean>;
  onAddProducts: (ids: string[]) => Promise<boolean>;
}

export const CatalogLibrary: React.FC<Props> = ({ catalogs, activeCatalogId, subscriptionActive, libraryProducts, onOpen, onPreview, onCreate, onDuplicate, onArchive, onRename, onDelete, onAddProducts }) => {
  const [creatingAudience, setCreatingAudience] = useState<CatalogAudience | null>(null);
  const [catalogName, setCatalogName] = useState("");
  const [creating, setCreating] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selection, setSelection] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const activeCatalog = catalogs.find((catalog) => catalog.id === activeCatalogId);
  const primaryCatalog = catalogs.find((catalog) => catalog.isPrimary);
  const additionalCatalogs = catalogs.filter((catalog) => !catalog.isPrimary);
  const filteredLibraryProducts = useMemo(() => {
    const query = productSearch.trim().toLocaleLowerCase("es");
    if (!query) return libraryProducts;
    return libraryProducts.filter((product) => [product.name, product.category, product.sku]
      .some((value) => String(value || "").toLocaleLowerCase("es").includes(query)));
  }, [libraryProducts, productSearch]);
  const visibleProductIds = filteredLibraryProducts.map((product) => product.id);
  const allVisibleSelected = visibleProductIds.length > 0 && visibleProductIds.every((id) => selection.includes(id));

  const toggleAllVisible = () => {
    setSelection((current) => allVisibleSelected
      ? current.filter((id) => !visibleProductIds.includes(id))
      : Array.from(new Set([...current, ...visibleProductIds])));
  };

  const closeProductSelector = () => {
    setSelecting(false);
    setSelection([]);
    setProductSearch("");
  };

  useEffect(() => {
    if (!creatingAudience) return;
    setCatalogName(creatingAudience === "wholesale" ? "Catálogo mayorista" : "Catálogo para clientes");
  }, [creatingAudience]);

  const submitCreate = async () => {
    if (!creatingAudience || !catalogName.trim()) return;
    setCreating(true);
    const saved = await onCreate(catalogName.trim(), creatingAudience);
    setCreating(false);
    if (saved) setCreatingAudience(null);
  };

  const handleRename = async (catalog: CatalogSummary) => {
    const name = window.prompt("Nuevo nombre del catálogo", catalog.name);
    if (!name?.trim() || name.trim() === catalog.name) return;
    await onRename(catalog, name);
  };

  const handleDelete = async (catalog: CatalogSummary) => {
    if (!window.confirm(`¿Eliminar el catálogo "${catalog.name}"?\n\nTus productos seguirán guardados en la biblioteca.`)) return;
    await onDelete(catalog);
  };

  return <section className="space-y-6" aria-labelledby="catalog-library-title">
    <div>
      <h2 id="catalog-library-title" className="text-xl font-bold text-slate-900">Organiza tus catálogos</h2>
      <p className="mt-1 max-w-2xl text-sm text-slate-500">Crea cada producto una sola vez. Después decide en qué catálogo mostrarlo y qué precio usar.</p>
    </div>

    <ol className="grid gap-3 md:grid-cols-3" aria-label="Cómo funciona">
      {[{ icon: Package, title: "1. Guarda tus productos", text: "Tu catálogo principal funciona como biblioteca." }, { icon: Store, title: "2. Elige a quién vender", text: "Crea una versión para clientes o mayoristas." }, { icon: FileText, title: "3. Ajusta y exporta", text: "Selecciona productos, cambia precios y genera el PDF." }].map(({ icon: Icon, title, text }) =>
        <li key={title} className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm"><Icon className="h-4 w-4" /></span><span><strong className="block text-sm text-slate-800">{title}</strong><span className="mt-1 block text-xs leading-5 text-slate-500">{text}</span></span></li>)}
    </ol>

    {primaryCatalog && <div className={`rounded-2xl border p-4 ${activeCatalogId === primaryCatalog.id ? "border-blue-400 bg-blue-50/60" : "border-slate-200 bg-white"}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700"><Package className="h-5 w-5" /></span><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-slate-900">Biblioteca de productos</h3><span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-700">BASE</span></div><p className="text-xs text-slate-500">{primaryCatalog.productCount} productos · Aquí creas y mantienes la información original.</p></div></div>
        <button type="button" onClick={() => onOpen(primaryCatalog.id)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800">{activeCatalogId === primaryCatalog.id && <Check className="h-4 w-4" />}{activeCatalogId === primaryCatalog.id ? "Estás trabajando aquí" : "Administrar productos"}</button>
      </div>
    </div>}

    <div>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2"><div><h3 className="font-bold text-slate-900">Catálogos para compartir</h3><p className="text-sm text-slate-500">Cada catálogo puede tener su propia selección y precios.</p></div>{!subscriptionActive && <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800"><LockKeyhole className="h-3.5 w-3.5" />Requiere suscripción</span>}</div>

      <div className="grid gap-3 md:grid-cols-2">
        <button type="button" disabled={!subscriptionActive} onClick={() => setCreatingAudience("retail")} className="group flex min-h-32 items-start gap-4 rounded-2xl border-2 border-dashed border-slate-200 bg-white p-5 text-left transition hover:border-blue-300 hover:bg-blue-50/40 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 group-hover:bg-blue-100 group-hover:text-blue-700"><Store className="h-5 w-5" /></span><span><strong className="block text-slate-900">Catálogo para clientes</strong><span className="mt-1 block text-sm leading-5 text-slate-500">Elige qué productos mostrar y conserva el precio de venta normal.</span><span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-blue-700">Crear catálogo <ArrowRight className="h-3.5 w-3.5" /></span></span></button>
        <button type="button" disabled={!subscriptionActive} onClick={() => setCreatingAudience("wholesale")} className="group flex min-h-32 items-start gap-4 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/40 p-5 text-left transition hover:border-blue-400 hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:opacity-60"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700"><Tags className="h-5 w-5" /></span><span><strong className="block text-slate-900">Catálogo mayorista</strong><span className="mt-1 block text-sm leading-5 text-slate-500">Copia tus productos y usa automáticamente el precio mayorista.</span><span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-blue-700">Crear catálogo <ArrowRight className="h-3.5 w-3.5" /></span></span></button>
      </div>
    </div>

    {additionalCatalogs.length > 0 && <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{additionalCatalogs.map((catalog) => {
      const wholesale = catalog.audience === "wholesale";
      return <article key={catalog.id} className={`rounded-xl border p-4 ${activeCatalogId === catalog.id ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white"} ${catalog.readOnly ? "opacity-70" : ""}`}>
        <button type="button" onClick={() => onOpen(catalog.id)} className="flex w-full items-start gap-3 text-left"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${wholesale ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"}`}>{wholesale ? <Tags className="h-5 w-5" /> : <Store className="h-5 w-5" />}</span><span className="min-w-0 flex-1"><span className="flex items-center gap-2"><strong className="truncate text-sm text-slate-900">{catalog.name}</strong>{catalog.readOnly && <LockKeyhole className="h-3.5 w-3.5 text-slate-400" />}</span><span className="mt-1 block text-xs text-slate-500">{wholesale ? "Mayoristas" : "Clientes"} · {catalog.productCount} productos · {catalog.status === "archived" ? "Archivado" : "Activo"}</span></span></button>
        <div className="mt-4 flex items-center gap-1 border-t border-slate-100 pt-3"><button type="button" onClick={() => void onPreview(catalog.id)} className="mr-auto inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"><Eye className="h-4 w-4" />Ver PDF</button><button type="button" onClick={() => void handleRename(catalog)} disabled={catalog.readOnly} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-blue-600 disabled:opacity-30" title="Cambiar nombre"><Pencil className="h-4 w-4" /></button><button type="button" onClick={() => void onDuplicate(catalog)} disabled={!subscriptionActive} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-blue-600 disabled:opacity-30" title="Duplicar"><Copy className="h-4 w-4" /></button><button type="button" onClick={() => void onArchive(catalog)} disabled={catalog.readOnly} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-blue-600 disabled:opacity-30" title={catalog.status === "archived" ? "Reactivar" : "Archivar"}><Archive className="h-4 w-4" /></button><button type="button" onClick={() => void handleDelete(catalog)} disabled={catalog.readOnly} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-30" title="Eliminar"><Trash2 className="h-4 w-4" /></button></div>
      </article>})}</div>}

    {activeCatalog && !activeCatalog.isPrimary && <div className={`rounded-xl border px-4 py-3 ${activeCatalog.audience === "wholesale" ? "border-blue-200 bg-blue-50 text-blue-900" : "border-slate-200 bg-slate-50 text-slate-700"}`}><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-start gap-2">{activeCatalog.audience === "wholesale" ? <Tags className="mt-0.5 h-4 w-4 shrink-0" /> : <Store className="mt-0.5 h-4 w-4 shrink-0" />}<div><strong className="block text-sm">Trabajando en: {activeCatalog.name}</strong><p className="mt-0.5 text-xs opacity-80">{activeCatalog.audience === "wholesale" ? "Los productos usan el precio mayorista. Puedes ajustar un precio solo para este catálogo desde Productos." : "Agrega únicamente los productos que quieras mostrar a tus clientes."}</p></div></div>{subscriptionActive && <button type="button" onClick={() => setSelecting(true)} className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-blue-700 shadow-sm ring-1 ring-blue-200"><Plus className="h-4 w-4" />Agregar productos</button>}</div></div>}

    {creatingAudience && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" role="dialog" aria-modal="true" aria-labelledby="create-catalog-title"><div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"><div className="flex items-start justify-between gap-3"><div><span className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${creatingAudience === "wholesale" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"}`}>{creatingAudience === "wholesale" ? <Tags className="h-5 w-5" /> : <Store className="h-5 w-5" />}</span><h3 id="create-catalog-title" className="text-lg font-bold text-slate-900">{creatingAudience === "wholesale" ? "Nuevo catálogo mayorista" : "Nuevo catálogo para clientes"}</h3><p className="mt-1 text-sm leading-5 text-slate-500">{creatingAudience === "wholesale" ? "Incluiremos tus productos actuales y aplicaremos sus precios mayoristas automáticamente." : "Empezará vacío para que selecciones exactamente qué productos mostrar."}</p></div><button type="button" onClick={() => setCreatingAudience(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button></div><label className="mt-5 block text-sm font-semibold text-slate-700" htmlFor="catalog-name">Nombre del catálogo</label><input id="catalog-name" autoFocus value={catalogName} onChange={(event) => setCatalogName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void submitCreate(); }} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setCreatingAudience(null)} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancelar</button><button type="button" disabled={creating || !catalogName.trim()} onClick={() => void submitCreate()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300">{creating ? "Creando..." : "Crear catálogo"}</button></div></div></div>}

    {selecting && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" role="dialog" aria-modal="true" aria-label="Seleccionar productos"><div className="flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"><div className="border-b border-slate-200 p-4"><h3 className="font-bold text-slate-900">Agregar productos</h3><p className="text-sm text-slate-500">Selecciona productos de tu biblioteca para incluirlos en {activeCatalog?.name}.</p><div className="relative mt-4"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input type="search" autoFocus value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Buscar por nombre, categoría o SKU" className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></div><div className="mt-3 flex items-center justify-between gap-3"><label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={allVisibleSelected} disabled={!visibleProductIds.length} onChange={toggleAllVisible} />Seleccionar todos{productSearch.trim() ? " los resultados" : ""}</label><span className="text-xs text-slate-500">{selection.length} seleccionados</span></div></div><div className="min-h-0 flex-1 overflow-y-auto p-4">{filteredLibraryProducts.length ? <div className="space-y-1">{filteredLibraryProducts.map((product) => <label key={product.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50"><input type="checkbox" checked={selection.includes(product.id)} onChange={(event) => setSelection((current) => event.target.checked ? Array.from(new Set([...current, product.id])) : current.filter((id) => id !== product.id))} /><span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{product.name}</span><span className="max-w-44 truncate text-xs text-slate-500">{product.category}</span></label>)}</div> : <div className="py-10 text-center"><Search className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-2 text-sm font-medium text-slate-600">No encontramos productos</p><p className="mt-1 text-xs text-slate-400">Prueba con otro nombre, categoría o SKU.</p></div>}</div><div className="flex items-center justify-between gap-2 border-t border-slate-200 p-4"><span className="text-xs text-slate-500">{filteredLibraryProducts.length} de {libraryProducts.length} productos</span><div className="flex gap-2"><button type="button" onClick={closeProductSelector} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600">Cancelar</button><button type="button" disabled={!selection.length} onClick={() => void onAddProducts(selection).then((saved) => { if (saved) closeProductSelector(); })} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:bg-slate-300">Agregar {selection.length || ""}</button></div></div></div></div>}
  </section>;
};
