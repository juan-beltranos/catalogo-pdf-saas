import React, { useState } from "react";
import { Archive, Copy, Eye, FileText, LockKeyhole, Pencil, Plus, Trash2 } from "lucide-react";
import type { CatalogSummary, Product } from "../types";

interface Props {
  catalogs: CatalogSummary[];
  activeCatalogId: string | null;
  subscriptionActive: boolean;
  libraryProducts: Product[];
  onOpen: (id: string) => void;
  onPreview: (id: string) => Promise<void>;
  onCreate: (name: string) => Promise<boolean>;
  onDuplicate: (catalog: CatalogSummary) => Promise<boolean>;
  onArchive: (catalog: CatalogSummary) => Promise<boolean>;
  onRename: (catalog: CatalogSummary, name: string) => Promise<boolean>;
  onDelete: (catalog: CatalogSummary) => Promise<boolean>;
  onAddProducts: (ids: string[]) => Promise<boolean>;
}

export const CatalogLibrary: React.FC<Props> = ({ catalogs, activeCatalogId, subscriptionActive, libraryProducts, onOpen, onPreview, onCreate, onDuplicate, onArchive, onRename, onDelete, onAddProducts }) => {
  const [creating, setCreating] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selection, setSelection] = useState<string[]>([]);
  const activeCatalog = catalogs.find((catalog) => catalog.id === activeCatalogId);
  const handleCreate = async () => {
    const name = window.prompt("Nombre del nuevo catálogo");
    if (!name?.trim()) return;
    setCreating(true); await onCreate(name); setCreating(false);
  };
  const handleRename = async (catalog: CatalogSummary) => {
    const name = window.prompt("Nuevo nombre del catálogo", catalog.name);
    if (!name?.trim() || name.trim() === catalog.name) return;
    await onRename(catalog, name);
  };
  const handleDelete = async (catalog: CatalogSummary) => {
    if (!window.confirm(`¿Eliminar el catálogo "${catalog.name}"?\n\nLos productos seguirán guardados en la biblioteca.`)) return;
    await onDelete(catalog);
  };
  return <section className="mb-6 border-b border-slate-200 pb-6" aria-labelledby="catalog-library-title">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
      <div><h2 id="catalog-library-title" className="text-base font-bold text-slate-900">Mis catálogos</h2>
        <p className="text-sm text-slate-500">Organiza las ediciones PDF desde una sola biblioteca.</p></div>
      <button type="button" onClick={() => void handleCreate()} disabled={!subscriptionActive || creating}
        className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        title={subscriptionActive ? "Crear catálogo" : "Requiere suscripción"}><Plus className="h-4 w-4" />Nuevo catálogo</button>
    </div>
    {!subscriptionActive && <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
      <LockKeyhole className="h-4 w-4 shrink-0" />El catálogo principal conserva todos los derechos de tu licencia. Los catálogos adicionales requieren suscripción.</div>}
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{catalogs.map((catalog) => <article key={catalog.id}
      className={`border p-3 ${activeCatalogId === catalog.id ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white"} ${catalog.readOnly ? "opacity-75" : ""}`}>
      <button type="button" onClick={() => onOpen(catalog.id)} className="flex w-full items-start gap-3 text-left">
        <FileText className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" /><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-slate-900">{catalog.name}</strong>
          <span className="block text-xs text-slate-500">{catalog.productCount} productos · {catalog.isPrimary ? "Principal" : catalog.status === "archived" ? "Archivado" : "Activo"}</span></span>
        {catalog.readOnly && <LockKeyhole className="h-4 w-4 text-slate-400" />}</button>
      <div className="mt-3 flex justify-end gap-1 border-t border-slate-100 pt-2">
        <button type="button" onClick={() => void onPreview(catalog.id)} className="mr-auto inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 hover:text-blue-800" title={`Previsualizar ${catalog.name}`}><Eye className="h-4 w-4" />Previsualizar</button>
        <button type="button" onClick={() => void handleRename(catalog)} disabled={catalog.readOnly} className="p-2 text-slate-500 hover:text-blue-600 disabled:opacity-30" title="Cambiar nombre"><Pencil className="h-4 w-4" /></button>
        {!catalog.isPrimary && <><button type="button" onClick={() => void onDuplicate(catalog)} disabled={!subscriptionActive} className="p-2 text-slate-500 hover:text-blue-600 disabled:opacity-30" title="Duplicar"><Copy className="h-4 w-4" /></button>
          <button type="button" onClick={() => void onArchive(catalog)} disabled={catalog.readOnly} className="p-2 text-slate-500 hover:text-blue-600 disabled:opacity-30" title={catalog.status === "archived" ? "Reactivar" : "Archivar"}><Archive className="h-4 w-4" /></button>
          <button type="button" onClick={() => void handleDelete(catalog)} disabled={catalog.readOnly} className="p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-30" title="Eliminar catálogo"><Trash2 className="h-4 w-4" /></button></>}
      </div>
    </article>)}</div>
    {activeCatalog && !activeCatalog.isPrimary && subscriptionActive && <button type="button" onClick={() => setSelecting(true)}
      className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-blue-400 hover:text-blue-700">
      <Plus className="h-4 w-4" />Agregar desde la biblioteca</button>}
    {selecting && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" role="dialog" aria-modal="true" aria-label="Seleccionar productos">
      <div className="max-h-[80vh] w-full max-w-xl overflow-hidden rounded-lg bg-white shadow-xl"><div className="border-b border-slate-200 p-4">
        <h3 className="font-bold text-slate-900">Productos de la biblioteca</h3><p className="text-sm text-slate-500">Selecciona los productos que formarán parte de este catálogo.</p></div>
        <div className="max-h-[52vh] overflow-y-auto p-4">{libraryProducts.length ? <div className="space-y-2">{libraryProducts.map((product) => <label key={product.id} className="flex cursor-pointer items-center gap-3 border-b border-slate-100 py-2">
          <input type="checkbox" checked={selection.includes(product.id)} onChange={(event) => setSelection((current) => event.target.checked ? [...current, product.id] : current.filter((id) => id !== product.id))} />
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{product.name}</span><span className="text-xs text-slate-500">{product.category}</span></label>)}</div>
          : <p className="py-8 text-center text-sm text-slate-500">Aún no hay productos en la biblioteca.</p>}</div>
        <div className="flex justify-end gap-2 border-t border-slate-200 p-4"><button type="button" onClick={() => { setSelecting(false); setSelection([]); }} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600">Cancelar</button>
          <button type="button" disabled={!selection.length} onClick={() => void onAddProducts(selection).then((saved) => { if (saved) { setSelecting(false); setSelection([]); } })}
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:bg-slate-300">Agregar {selection.length || ""}</button></div></div></div>}
  </section>;
};
