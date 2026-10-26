"use client";

import { useEffect, useMemo, useState } from "react";
import DOMPurify from "dompurify";
import { ArrowLeft, ArrowRight, Facebook, Grid2X2, Instagram, List, MapPin, MessageCircle, Minus, Plus, Search, Share2, ShoppingCart, X } from "lucide-react";
import type { Product, StoreInfo } from "../types";
import { formatCurrency } from "../constants";
import { facebookUrl, getCurrencyForWaCountry, instagramUrl, normalizeWaNumber, type CatalogCurrency } from "../helper/social";
import { ProductThumb } from "./ProductThumb";

export function DigitalCatalog({ catalogName, storeInfo, products }: { catalogName: string; storeInfo: StoreInfo; products: Product[] }) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [detailQuantity, setDetailQuantity] = useState(1);
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todos");
  const [listMode, setListMode] = useState(false);
  const [page, setPage] = useState(1);
  const currency = getCurrencyForWaCountry(storeInfo.whatsappCountryCode);
  const primary = storeInfo.color || "#2563eb";
  const showPrices = storeInfo.showPrices !== false;
  const visible = [...products].filter((product) => !product.hidden).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const categories = [...new Set(visible.map((product) => product.category?.trim()).filter(Boolean))];
  const query = search.trim().toLocaleLowerCase("es");
  const filtered = visible.filter((product) => {
    // Search spans the whole catalog, even when a category tab was selected.
    const matchesCategory = !!query || category === "Todos" || product.category?.trim() === category;
    const matchesSearch = !query || [product.name, product.sku, product.category, plainDescription(product.description || "")]
      .some((value) => String(value || "").toLocaleLowerCase("es").includes(query));
    return matchesCategory && matchesSearch;
  });
  const pageSize = 20;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageProducts = filtered.slice((page - 1) * pageSize, page * pageSize);
  const items = useMemo(() => visible.filter((product) => cart[product.id]).map((product) => ({ product, qty: cart[product.id] })), [visible, cart]);
  const total = items.reduce((sum, item) => sum + item.product.price * item.qty, 0);
  const count = items.reduce((sum, item) => sum + item.qty, 0);

  const adjust = (id: string, delta: number) => setCart((current) => {
    const next = { ...current }, quantity = (next[id] || 0) + delta;
    const product = visible.find((item) => item.id === id);
    if (quantity <= 0) delete next[id];
    else if (product?.quantity == null || quantity <= product.quantity) next[id] = quantity;
    return next;
  });
  const shareCatalog = async () => {
    const data = { title: storeInfo.name || catalogName, text: `Mira el catálogo de ${storeInfo.name || catalogName}`, url: window.location.href };
    if (navigator.share) await navigator.share(data).catch(() => undefined);
    else await navigator.clipboard.writeText(window.location.href);
  };
  const checkout = () => {
    const phone = normalizeWaNumber(storeInfo.whatsapp || "", storeInfo.whatsappCountryCode);
    if (!phone || !items.length) return;
    const lines = items.map(({ product, qty }) => `• ${product.name} x${qty}${showPrices ? ` — ${formatCurrency(product.price * qty, currency)}` : ""}`);
    const text = [`Hola, quiero hacer este pedido de ${catalogName}:`, ...lines, ...(showPrices ? [`Total: ${formatCurrency(total, currency)}`] : []),
      customerName.trim() ? `Nombre: ${customerName.trim()}` : "", customerAddress.trim() ? `Dirección: ${customerAddress.trim()}` : "",
      customerNotes.trim() ? `Notas: ${customerNotes.trim()}` : ""].filter(Boolean).join("\n");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };
  const addFromDetail = () => {
    if (!selectedProduct) return;
    for (let i = 0; i < detailQuantity; i += 1) adjust(selectedProduct.id, 1);
    setSelectedProduct(null);
  };
  const heroImage = storeInfo.headerMode === "image" && storeInfo.headerImage ? storeInfo.headerImage : storeInfo.coverImage || "";

  return <div className="min-h-screen bg-[#f4f5f7] text-slate-900" style={{ "--store-primary": primary } as React.CSSProperties}>
    <div className="mx-auto min-h-screen max-w-6xl bg-[#f4f5f7] pb-24 shadow-sm">
      <header className="relative">
        <div className="relative h-32 overflow-hidden bg-slate-200 sm:h-52" style={{ backgroundColor: primary }}>
          {heroImage && <img src={heroImage} alt="Banner de la tienda" className="h-full w-full object-cover" />}
          {!heroImage && <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `radial-gradient(circle at 20% 30%, white 0 2px, transparent 3px), linear-gradient(135deg, transparent, ${primary})`, backgroundSize: "34px 34px, auto" }} />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
        </div>
        <section className="relative mx-3 -mt-5 rounded-2xl border border-slate-100 bg-white px-4 pb-3 pt-3 shadow-sm sm:mx-6 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="-mt-10 grid h-[68px] w-[68px] shrink-0 place-items-center overflow-hidden rounded-2xl border-4 border-white bg-white shadow-md sm:h-20 sm:w-20">
              {storeInfo.logo ? <img src={storeInfo.logo} alt={`Logo de ${storeInfo.name || catalogName}`} className="h-full w-full object-contain" /> : <span className="text-2xl font-black text-white" style={{ backgroundColor: primary }}>{(storeInfo.name || catalogName).slice(0, 1)}</span>}
            </div>
            <div className="min-w-0 flex-1"><h1 className="truncate text-base font-extrabold sm:text-xl">{storeInfo.name || catalogName}</h1><p className="truncate text-xs text-slate-500">{catalogName}</p><span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500"/>Pedidos por WhatsApp</span></div>
            <div className="flex shrink-0 items-center gap-2"><button onClick={() => void shareCatalog()} aria-label="Compartir catálogo" className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"><Share2 className="h-4 w-4"/></button><button onClick={() => setCartOpen(true)} aria-label={`Abrir carrito, ${count} productos`} className="relative grid h-10 w-10 place-items-center rounded-xl text-white shadow-sm" style={{ backgroundColor: primary }}><ShoppingCart className="h-5 w-5"/>{count > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-slate-900 px-1 text-[10px] font-bold text-white">{count}</span>}</button></div>
          </div>
          <div className="mt-3 flex items-center gap-3 border-t border-slate-100 pt-2 text-slate-500">
            {storeInfo.instagram && <a href={instagramUrl(storeInfo.instagram)} target="_blank" rel="noreferrer" aria-label="Instagram" className="hover:text-slate-900"><Instagram className="h-4 w-4"/></a>}
            {storeInfo.facebook && <a href={facebookUrl(storeInfo.facebook)} target="_blank" rel="noreferrer" aria-label="Facebook" className="hover:text-slate-900"><Facebook className="h-4 w-4"/></a>}
            {storeInfo.whatsapp && <a href={`https://wa.me/${normalizeWaNumber(storeInfo.whatsapp, storeInfo.whatsappCountryCode)}`} target="_blank" rel="noreferrer" aria-label="WhatsApp" title="WhatsApp" className="hover:text-slate-900"><MessageCircle className="h-4 w-4"/></a>}
            {storeInfo.additionalInfo && <span className="ml-auto flex min-w-0 items-center gap-1 truncate text-[11px]"><MapPin className="h-3.5 w-3.5 shrink-0"/>{storeInfo.additionalInfo}</span>}
          </div>
        </section>
      </header>

      <nav className="sticky top-0 z-10 mt-4 border-y border-slate-200 bg-white/95 px-3 py-2 backdrop-blur sm:px-6" aria-label="Categorías del catálogo">
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          {["Todos", ...categories].map((item) => <button key={item} onClick={() => { setCategory(item); setPage(1); }} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold transition ${category === item ? "text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`} style={category === item ? { backgroundColor: primary } : undefined}>{item === "Todos" ? "Inicio" : item}</button>)}
        </div>
      </nav>

      <main className="px-3 pt-4 sm:px-6 sm:pt-6">
        <label className="relative block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input value={search} onChange={(event) => { setSearch(event.target.value); setCategory("Todos"); setPage(1); }} placeholder="Buscar en todo el catálogo..." className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm shadow-sm outline-none placeholder:text-slate-400 focus:border-slate-400" /></label>
        <div className="mb-3 mt-5 flex items-center justify-between"><p className="text-xs text-slate-500">{category === "Todos" ? "Todos los productos" : category} <span className="text-slate-400">· {filtered.length}</span></p><div className="flex rounded-lg bg-white p-1 shadow-sm"><button onClick={() => setListMode(false)} aria-label="Ver en cuadrícula" className={`rounded-md p-1.5 ${!listMode ? "text-white" : "text-slate-400"}`} style={!listMode ? { backgroundColor: primary } : undefined}><Grid2X2 className="h-4 w-4"/></button><button onClick={() => setListMode(true)} aria-label="Ver en lista" className={`rounded-md p-1.5 ${listMode ? "text-white" : "text-slate-400"}`} style={listMode ? { backgroundColor: primary } : undefined}><List className="h-4 w-4"/></button></div></div>
        {filtered.length ? <div className={listMode ? "grid grid-cols-1 gap-3 sm:grid-cols-2" : "grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4"}>{pageProducts.map((product) => <ProductCard key={product.id} product={product} currency={currency} primary={primary} listMode={listMode} showPrices={showPrices} showQuantity={!!storeInfo.showQuantityInPdf} onOpen={() => { setSelectedProduct(product); setDetailQuantity(1); }} onAdd={() => adjust(product.id, 1)} disabled={product.quantity === 0}/>)}</div> : <p className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500">{visible.length ? "No encontramos productos con esa búsqueda." : "Este catálogo todavía no tiene productos."}</p>}
        {pageCount > 1 && <nav aria-label="Paginación del catálogo" className="mt-6 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3"><span className="text-xs text-slate-500">{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} de {filtered.length} productos</span><div className="flex items-center gap-2"><button type="button" onClick={() => { setPage((current) => Math.max(1, current - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }} disabled={page === 1} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-40"><ArrowLeft className="h-3.5 w-3.5"/>Anterior</button><span className="min-w-16 text-center text-xs font-semibold text-slate-600">{page} / {pageCount}</span><button type="button" onClick={() => { setPage((current) => Math.min(pageCount, current + 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }} disabled={page === pageCount} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-40">Siguiente<ArrowRight className="h-3.5 w-3.5"/></button></div></nav>}
      </main>
    </div>

    {count > 0 && !cartOpen && <button onClick={() => setCartOpen(true)} className="fixed bottom-4 left-3 right-3 z-20 mx-auto flex max-w-xl items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold text-white shadow-xl sm:left-auto sm:right-6" style={{ backgroundColor: primary }}><span className="flex items-center gap-2"><ShoppingCart className="h-4 w-4"/>Ver pedido ({count})</span>{showPrices && <span>{formatCurrency(total, currency)}</span>}</button>}

    {selectedProduct && <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/50 sm:items-center sm:p-5" onClick={() => setSelectedProduct(null)}><section className="flex max-h-[94vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white sm:rounded-3xl" onClick={(event) => event.stopPropagation()}>
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3"><h2 className="min-w-0 flex-1 break-words text-base font-extrabold leading-6">{selectedProduct.name}</h2><button onClick={() => setSelectedProduct(null)} aria-label="Cerrar producto" className="shrink-0 rounded-full border p-2"><X className="h-4 w-4"/></button></div>
      <div className="overflow-auto p-4"><div className="h-64 overflow-hidden rounded-2xl bg-slate-100 sm:h-80"><ProductThumb product={selectedProduct} className="h-full w-full object-contain"/></div>{selectedProduct.description && <ProductDescription key={selectedProduct.id} html={selectedProduct.description} />}{selectedProduct.sku && <p className="mt-2 text-xs text-slate-400">SKU: {selectedProduct.sku}</p>}{showPrices && <div className="mt-4 flex items-center justify-between text-sm"><span className="text-slate-500">Precio</span><div className="text-right">{selectedProduct.originalPrice != null && selectedProduct.originalPrice > selectedProduct.price && <p className="text-xs text-slate-400 line-through">Antes {formatCurrency(selectedProduct.originalPrice, currency)}</p>}<strong className="text-lg">{formatCurrency(selectedProduct.price * detailQuantity, currency)}</strong></div></div>}{storeInfo.showQuantityInPdf && selectedProduct.quantity != null && <p className="mt-2 text-xs text-slate-500">Existencias: {selectedProduct.quantity}</p>}<div className="mt-5"><p className="mb-2 text-sm font-bold">Cantidad</p><div className="flex items-center gap-2"><button onClick={() => setDetailQuantity((qty) => Math.max(1, qty - 1))} className="rounded-xl border p-2.5"><Minus className="h-4 w-4"/></button><span className="flex-1 rounded-xl border py-2.5 text-center font-bold">{detailQuantity}</span><button onClick={() => setDetailQuantity((qty) => Math.min(selectedProduct.quantity ?? 999, qty + 1))} disabled={selectedProduct.quantity != null && detailQuantity >= selectedProduct.quantity} className="rounded-xl border p-2.5 disabled:opacity-40"><Plus className="h-4 w-4"/></button></div></div></div>
      <div className="flex gap-2 border-t border-slate-100 p-3"><button onClick={() => setSelectedProduct(null)} className="flex-1 rounded-xl border py-3 text-sm font-bold">Cerrar</button><button onClick={addFromDetail} disabled={selectedProduct.quantity === 0} className="flex-[1.2] rounded-xl py-3 text-sm font-bold text-white disabled:opacity-50" style={{ backgroundColor: primary }}>Añadir al carrito</button></div>
    </section></div>}

    {cartOpen && <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/45" onClick={() => setCartOpen(false)}><aside className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="text-lg font-extrabold">Tu pedido</h2><p className="text-xs text-slate-500">{count} productos · {storeInfo.name || catalogName}</p></div><button onClick={() => setCartOpen(false)} aria-label="Cerrar carrito" className="rounded-lg p-2 hover:bg-slate-100"><X/></button></div>
      <div className="flex-1 space-y-4 overflow-auto p-5">{items.map(({ product, qty }) => <div key={product.id} className="flex items-center gap-3"><div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100"><ProductThumb product={product} className="h-full w-full object-contain"/></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{product.name}</p><p className="mt-1 text-xs text-slate-500">{formatCurrency(product.price * qty, currency)}</p></div><div className="flex items-center gap-2"><button onClick={() => adjust(product.id, -1)} aria-label="Quitar uno" className="rounded-full border p-1.5"><Minus className="h-3 w-3"/></button><span className="w-4 text-center text-sm font-bold">{qty}</span><button onClick={() => adjust(product.id, 1)} aria-label="Agregar uno" className="rounded-full border p-1.5"><Plus className="h-3 w-3"/></button></div></div>)}{!items.length && <p className="py-12 text-center text-slate-500">Tu carrito está vacío. Agrega productos para hacer un pedido.</p>}</div>
      {items.length > 0 && <div className="space-y-3 border-t border-slate-100 p-5"><input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Tu nombre (opcional)" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-slate-400"/><input value={customerAddress} onChange={(event) => setCustomerAddress(event.target.value)} placeholder="Dirección o zona de entrega (opcional)" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-slate-400"/><textarea value={customerNotes} onChange={(event) => setCustomerNotes(event.target.value)} placeholder="Notas del pedido (opcional)" rows={2} className="w-full resize-none rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-slate-400"/>{showPrices && <div className="flex justify-between border-t border-slate-100 pt-3 text-lg font-black"><span>Total</span><span>{formatCurrency(total, currency)}</span></div>}<button onClick={checkout} className="w-full rounded-xl py-3.5 font-bold text-white" style={{ backgroundColor: primary }}>Enviar pedido por WhatsApp</button></div>}
    </aside></div>}
  </div>;
}

function ProductDescription({ html }: { html: string }) {
  const [safeHtml, setSafeHtml] = useState(plainDescription(html));
  useEffect(() => {
    const config = {
      USE_PROFILES: { html: true },
      ADD_TAGS: ["table", "thead", "tbody", "tfoot", "tr", "th", "td", "colgroup", "col"],
      ADD_ATTR: ["colspan", "rowspan", "scope", "style", "width"],
    };
    let sanitized = DOMPurify.sanitize(html, config);
    let parsed = new DOMParser().parseFromString(sanitized, "text/html");
    // Older imports may contain HTML escaped one extra time. Decode that
    // markup only when the whole value is recognizable formatting HTML.
    const literalMarkup = parsed.body.textContent?.trim() || "";
    if (/^<(?:table|p|ul|ol|strong|em|h[1-6])\b/i.test(literalMarkup)) {
      sanitized = DOMPurify.sanitize(literalMarkup, config);
      parsed = new DOMParser().parseFromString(sanitized, "text/html");
    }
    setSafeHtml(parsed.body.innerHTML);
  }, [html]);
  if (!plainDescription(html) && !/<(?:table|img|hr|br)\b/i.test(html)) return null;
  return <div className="digital-product-description catalog-html mt-4 break-words text-sm leading-6 text-slate-600" dangerouslySetInnerHTML={{ __html: safeHtml }}/>;
}

function plainDescription(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/&nbsp;|&#160;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, "\"").replace(/&#39;|&apos;/gi, "'").replace(/\s+/g, " ").trim();
}

function ProductCard({ product, currency, primary, listMode, showPrices, showQuantity, onOpen, onAdd, disabled }: { product: Product; currency: CatalogCurrency; primary: string; listMode: boolean; showPrices: boolean; showQuantity: boolean; onOpen: () => void; onAdd: () => void; disabled?: boolean }) {
  return <article className={`relative overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm ${listMode ? "flex items-center gap-3 p-2" : ""}`}>
    <button type="button" onClick={onOpen} className={`block overflow-hidden bg-slate-100 ${listMode ? "h-24 w-24 shrink-0 rounded-xl" : "aspect-square w-full"}`}><ProductThumb product={product} className="h-full w-full object-contain"/></button>
    {product.featured && <span className="absolute left-2 top-2 rounded-full px-2 py-1 text-[9px] font-extrabold text-white shadow-sm" style={{ backgroundColor: primary }}>Destacado</span>}
    <div className={listMode ? "flex min-w-0 flex-1 items-center justify-between gap-2 py-1 pr-1" : "p-3 pt-2.5"}>
      <button type="button" onClick={onOpen} className="min-w-0 text-left"><h3 className="break-words text-[13px] font-extrabold leading-4">{product.name}</h3>{product.sku && <span className="mt-1 inline-block max-w-full truncate rounded-full bg-slate-100 px-2 py-1 text-[9px] font-semibold text-slate-500">SKU: {product.sku}</span>}{showQuantity && product.quantity != null && <span className="mt-1 block text-[10px] text-slate-500">Stock: {product.quantity}</span>}</button>
      <div className={`flex items-center justify-between gap-2 ${listMode ? "shrink-0 flex-col items-end" : "mt-2"}`}>{showPrices && <span className="text-sm font-black" style={{ color: primary }}>{product.originalPrice != null && product.originalPrice > product.price && <span className="mr-1 text-[10px] font-normal text-slate-400 line-through">{formatCurrency(product.originalPrice, currency)}</span>}{formatCurrency(product.price, currency)}</span>}<button type="button" onClick={onAdd} disabled={disabled} aria-label={`Agregar ${product.name}`} title={disabled ? "Agotado" : "Agregar al carrito"} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white shadow-sm transition hover:brightness-95 disabled:bg-slate-300" style={disabled ? undefined : { backgroundColor: primary }}><Plus className="h-5 w-5"/></button></div>
    </div>
  </article>;
}
