"use client";

import React, { useState, useRef } from "react";
import { useCatalog } from "./hooks/useCatalog.ts";
import { StoreForm } from "./components/StoreForm.tsx";
import { ProductManager } from "./components/ProductManager.tsx";
import { CatalogPreview } from "./components/CatalogPreview.tsx";
import { ExportButton } from "./components/ExportButton.tsx";
import { TemplateSelector } from "./components/TemplateSelector.tsx";
import { ViewMode, TemplateId } from "./types.ts";
import { Eye, Edit3, LayoutTemplate, LockKeyhole, Package, Sparkles, Store, CheckCircle2, type LucideIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { User } from "@supabase/supabase-js";
import { useAuth } from "./hooks/useAuth";
import { AuthScreen } from "./components/AuthScreen";
import { ConfigurationRequired } from "./components/ConfigurationRequired";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import { Loader2, LogOut } from "lucide-react";
import { PasswordRecovery } from "./components/PasswordRecovery";
import { WhatsAppSupportButton } from "./components/WhatsAppSupportButton";
import { CatalogLibrary } from "./components/CatalogLibrary";
import { WorkspaceSidebar, type WorkspaceModule } from "./components/WorkspaceSidebar";
import { getPlan } from "./lib/plans";

const FOOTER_BANNER_URL =
  "https://firebasestorage.googleapis.com/v0/b/sistema-catalogo-digitales.firebasestorage.app/o/banner-catalogo-digital.jpg?alt=media&token=c874b38a-b8d3-457c-8b3e-50af5c97eae0";

const ModulePanel: React.FC<{ icon: LucideIcon; title: string; description: string; children: React.ReactNode }> = ({ icon: Icon, title, description, children }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
    <header className="mb-6 flex items-start gap-3 border-b border-slate-100 pb-5">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600"><Icon className="h-5 w-5" /></span>
      <div><h2 className="text-xl font-bold text-slate-900">{title}</h2><p className="mt-1 text-sm text-slate-500">{description}</p></div>
    </header>
    {children}
  </section>
);

const PremiumNotice: React.FC<{ title: string; description: string }> = ({ title, description }) => (
  <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
    <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="text-sm font-bold">{title}</p><p className="mt-1 text-sm text-amber-700">{description}</p></div>
  </div>
);

const ToolCard: React.FC<{ title: string; description: string; href: string; label: string; locked: boolean }> = ({ title, description, href, label, locked }) => (
  <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
    <div className="flex items-center justify-between gap-3"><Sparkles className="h-5 w-5 text-blue-600" />{locked && <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-700"><LockKeyhole className="h-3 w-3" />Suscripción</span>}</div>
    <h3 className="mt-4 font-bold text-slate-900">{title}</h3><p className="mt-2 text-sm text-slate-500">{description}</p>
    {locked ? <button type="button" disabled className="mt-4 rounded-lg bg-slate-200 px-3 py-2 text-sm font-bold text-slate-500">{label}</button> : <a href={href} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block rounded-lg bg-blue-600 px-3 py-2 text-sm font-bold text-white hover:bg-blue-700">{label}</a>}
  </article>
);

const PlanStat: React.FC<{ label: string; value: string }> = ({ label, value }) => <div className="rounded-2xl border border-slate-200 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-2 text-lg font-bold text-slate-900">{value}</p></div>;

const FeatureState: React.FC<{ enabled: boolean; label: string }> = ({ enabled, label }) => <li className="flex items-center gap-2"><CheckCircle2 className={`h-4 w-4 ${enabled ? "text-emerald-500" : "text-slate-300"}`} /><span>{label}</span>{!enabled && <LockKeyhole className="h-3.5 w-3.5 text-slate-400" />}</li>;

const CatalogApp: React.FC<{ user: User }> = ({ user }) => {
  const {
    storeInfo,
    products,
    libraryProducts,
    plan,
    entitlements,
    catalogs,
    activeCatalog,
    activeCatalogId,
    openCatalog,
    createCatalog,
    duplicateCatalog,
    archiveCatalog,
    renameCatalog,
    deleteCatalog,
    addLibraryProductsToCatalog,
    updateStoreInfo,
    addProduct,
    updateProduct,
    removeProduct,
    loading,
    error,
  } = useCatalog(user);

  const [viewMode, setViewMode] = useState<ViewMode>("editor");
  const [activeModule, setActiveModule] = useState<WorkspaceModule>("products");
  const previewRef = useRef<HTMLDivElement>(null);

  const handleTemplateSelect = (id: TemplateId) => {
    updateStoreInfo({ templateId: id });
  };

  const handlePdfProductsPerPageChange = (value: number) => {
    updateStoreInfo({ pdfProductsPerPage: value } as any);
  };

  const handleCatalogPreview = async (catalogId: string) => {
    const opened = await openCatalog(catalogId);
    if (opened) setViewMode("preview");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-white p-2 rounded-lg text-white">
              <img
                src="https://www.inteliasb.com/assets/logo-intelia-B77psNHY.png"
                alt="logo"
                className="w-[48px] md:w-[45px]"
              />
            </div>

            <h1 className="font-bold text-lg tracking-tight hidden sm:block">
              Catálogo Instantáneo
            </h1>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode("editor")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                viewMode === "editor"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Edit3 className="w-4 h-4" />
              <span className="hidden sm:inline">Editor</span>
            </button>

            <button
              onClick={() => setViewMode("preview")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                viewMode === "preview"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">Previsualizar</span>
            </button>
          </div>

          {/* <button
            onClick={clearAll}
            className="text-slate-400 hover:text-red-500 transition-colors p-2"
            title="Limpiar todo"
          >
            <Trash2 className="w-5 h-5" />
          </button> */}
          <button onClick={() => void supabase?.auth.signOut()} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-800" title={`Cerrar sesión (${user.email || "usuario"})`}>
            <span className={`hidden rounded-full px-2 py-1 text-xs font-bold md:inline ${entitlements.subscriptionActive ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"}`}>{plan.name}</span>
            <LogOut className="h-4 w-4"/><span className="hidden md:inline">Salir</span>
          </button>
        </div>
      </header>

      {error && <div role="alert" className="mx-auto mt-4 max-w-6xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">No se pudo sincronizar: {error}</div>}

      <main className={`mx-auto px-4 py-6 ${viewMode === "preview" ? "max-w-6xl" : "max-w-[1440px]"}`}>
        <AnimatePresence mode="wait">
          {viewMode === "editor" ? (
            <motion.div key="editor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="lg:flex lg:items-start lg:gap-6">
              <WorkspaceSidebar activeModule={activeModule} onChange={setActiveModule} planName={plan.name} toolsEnabled={entitlements.canUsePremiumProductTools} catalogName={activeCatalog?.name} />
              <div className="min-w-0 flex-1">
                {activeCatalog?.readOnly && <div role="status" className="mb-5 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"><LockKeyhole className="h-4 w-4 shrink-0" />Este catálogo está en modo lectura. Reactiva la suscripción para modificarlo.</div>}
                {activeModule === "catalogs" && <ModulePanel icon={Package} title="Mis catálogos" description="Administra tus ediciones y selecciona el catálogo en el que quieres trabajar."><CatalogLibrary catalogs={catalogs} activeCatalogId={activeCatalogId} subscriptionActive={entitlements.subscriptionActive} libraryProducts={libraryProducts} onOpen={(id) => void openCatalog(id)} onPreview={handleCatalogPreview} onCreate={createCatalog} onDuplicate={duplicateCatalog} onArchive={archiveCatalog} onRename={renameCatalog} onDelete={deleteCatalog} onAddProducts={addLibraryProductsToCatalog} /></ModulePanel>}
                {activeModule === "products" && <ProductManager products={products} plan={plan} currency={storeInfo.whatsappCountryCode === "52" ? "MXN" : "COP"} onAdd={addProduct} onRemove={removeProduct} onUpdate={updateProduct} headerAction={<button type="button" onClick={() => setActiveModule("design")} className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"><LayoutTemplate className="h-4 w-4" />Diseño del PDF</button>} />}
                {activeModule === "design" && <ModulePanel icon={LayoutTemplate} title="Diseño del PDF" description="Elige la plantilla y define cómo se distribuyen los productos en cada página."><TemplateSelector selectedId={storeInfo.templateId} onSelect={handleTemplateSelect} pdfProductsPerPage={(storeInfo as any).pdfProductsPerPage ?? 4} onPdfProductsPerPageChange={handlePdfProductsPerPageChange} advancedLayouts={entitlements.canUseAdvancedLayouts} /></ModulePanel>}
                {activeModule === "store" && <ModulePanel icon={Store} title="Mi tienda" description="Configura la identidad, información de contacto y redes de tu negocio."><StoreForm storeInfo={storeInfo} onUpdate={updateStoreInfo} canCustomize={entitlements.canCustomizeBrand} /></ModulePanel>}
                {activeModule === "tools" && <ModulePanel icon={Sparkles} title="Herramientas" description="Prepara tu PDF para compartirlo y conviértelo en una experiencia digital.">{!entitlements.canUsePremiumProductTools && <PremiumNotice title="Herramientas Premium" description="Este módulo está incluido en Premium o con una suscripción activa." />}<div className={`grid gap-4 md:grid-cols-2 ${!entitlements.canUsePremiumProductTools ? "opacity-60" : ""}`}><ToolCard title="Optimizar o comprimir PDF" description="Reduce el peso de tu catálogo antes de compartirlo." href="https://www.ilovepdf.com/es/comprimir_pdf" label="Comprimir PDF" locked={!entitlements.canUsePremiumProductTools} /><ToolCard title="Crear catálogo digital" description="Convierte tu PDF en un catálogo interactivo para tus clientes." href="https://heyzine.com/es" label="Abrir Heyzine" locked={!entitlements.canUsePremiumProductTools} /></div></ModulePanel>}
                {activeModule === "plan" && <ModulePanel icon={CheckCircle2} title="Plan y suscripción" description="Consulta el uso disponible y las funciones incluidas en tu cuenta."><div className={`mb-5 flex items-center gap-3 rounded-2xl border p-4 ${entitlements.subscriptionActive ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-600"}`}>{entitlements.subscriptionActive ? <CheckCircle2 className="h-5 w-5" /> : <LockKeyhole className="h-5 w-5" />}<div><p className="font-bold">{entitlements.subscriptionActive ? "Suscripción activa" : "No tienes una suscripción activa"}</p><p className="text-sm">{entitlements.subscriptionActive ? `Todo está habilitado y sin límites. Si vence, volverás a tu versión ${getPlan(entitlements.lifetimePlan).name}.` : `Estás usando tu versión comprada ${getPlan(entitlements.lifetimePlan).name}, con un único catálogo principal.`}</p></div></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><PlanStat label="Estado actual" value={entitlements.subscriptionActive ? "Suscripción" : getPlan(entitlements.lifetimePlan).name} /><PlanStat label="Versión comprada" value={getPlan(entitlements.lifetimePlan).name} /><PlanStat label="Productos" value={plan.products === null ? "Ilimitados" : `${products.length} de ${plan.products}`} /><PlanStat label="Catálogos" value={entitlements.subscriptionActive ? "Ilimitados" : "1 catálogo"} /></div><div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5"><h3 className="font-bold text-slate-900">Funciones de tu cuenta</h3><ul className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2"><FeatureState enabled={entitlements.canCustomizeBrand} label="Personalización de marca" /><FeatureState enabled={entitlements.canImportExcel} label="Importar y exportar Excel" /><FeatureState enabled={entitlements.canUseAdvancedLayouts} label="Layouts avanzados" /><FeatureState enabled={entitlements.subscriptionActive} label="Catálogos ilimitados" /></ul></div></ModulePanel>}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="flex flex-col items-center"
            >
              <div className="mb-6 text-center max-w-xl">
                <h2 className="text-2xl font-bold mb-2">
                  Vista previa · {activeCatalog?.name || "Catálogo principal"}
                </h2>

                <p className="text-slate-500 text-sm">
                  Así es como se verá tu catálogo cuando tus clientes lo reciban
                  por WhatsApp.
                </p>
              </div>

              <ExportButton
                targetRef={previewRef}
                fileName={storeInfo.name || "mi-catalogo"}
                products={products}
                businessWhatsapp={storeInfo.whatsapp || ""}
                businessWhatsappCountryCode={storeInfo.whatsappCountryCode}
                currency={storeInfo.whatsappCountryCode === "52" ? "MXN" : "COP"}
                pdfProductsPerPage={(storeInfo as any).pdfProductsPerPage ?? 4}
                coverImage={storeInfo.coverImage}
                showWatermarkInPdf={!!storeInfo.showWatermarkInPdf}
                watermarkLogo={storeInfo.logo}
              />

              <div className="flex w-full justify-center overflow-x-auto rounded-3xl border border-slate-200 bg-slate-200/50 shadow-inner">
                <CatalogPreview
                  storeInfo={storeInfo}
                  products={products}
                  previewRef={previewRef}
                  pdfProductsPerPage={
                    (storeInfo as any).pdfProductsPerPage ?? 4
                  }
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer Info */}
      <footer className="border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm">
            <a
              href="https://www.inteliasb.com/catalogo-digital"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm transition-transform hover:scale-[1.01]"
            >
              <img
                src={FOOTER_BANNER_URL}
                alt="Banner promocional"
                loading="lazy"
                className="block w-full h-auto object-contain"
              />
            </a>
          </div>

          <div className="mt-8 text-center">
            <p className="text-slate-400 text-sm flex items-center justify-center gap-2">
              Hecho con ❤️ para emprendedores imparables
            </p>
          </div>
        </div>
      </footer>

      {/* Floating Export Button */}
      {false && viewMode === "preview" && (
        <ExportButton
          targetRef={previewRef}
          fileName={storeInfo.name || "mi-catalogo"}
          products={products}
          businessWhatsapp={storeInfo.whatsapp || ""}
          businessWhatsappCountryCode={storeInfo.whatsappCountryCode}
          currency={storeInfo.whatsappCountryCode === "52" ? "MXN" : "COP"}
          pdfProductsPerPage={(storeInfo as any).pdfProductsPerPage ?? 4}
          coverImage={storeInfo.coverImage}
          showWatermarkInPdf={!!storeInfo.showWatermarkInPdf}
          watermarkLogo={storeInfo.logo}
        />
      )}
      {viewMode !== "preview" && <WhatsAppSupportButton />}
    </div>
  );
};

export const App: React.FC<{ registrationToken?: string }> = ({ registrationToken = "" }) => {
  const { user, loading, passwordRecovery, finishPasswordRecovery } = useAuth();
  if (!isSupabaseConfigured) return <><ConfigurationRequired /><WhatsAppSupportButton /></>;
  if (loading) return <><div className="min-h-screen flex items-center justify-center bg-slate-950"><Loader2 className="h-8 w-8 animate-spin text-white" /></div><WhatsAppSupportButton /></>;
  if (passwordRecovery) return <><PasswordRecovery onDone={finishPasswordRecovery} /><WhatsAppSupportButton /></>;
  return user
    ? <CatalogApp user={user} />
    : <><AuthScreen initialRegistrationToken={registrationToken} /><WhatsAppSupportButton /></>;
};
