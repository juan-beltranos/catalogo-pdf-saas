"use client";

import React, { useEffect, useState, useRef } from "react";
import { useCatalog } from "./hooks/useCatalog.ts";
import { StoreForm } from "./components/StoreForm.tsx";
import { ProductManager } from "./components/ProductManager.tsx";
import { CatalogPreview } from "./components/CatalogPreview.tsx";
import { ExportButton } from "./components/ExportButton.tsx";
import { TemplateSelector } from "./components/TemplateSelector.tsx";
import { ViewMode, TemplateId } from "./types.ts";
import { Eye, Edit3, Settings2, Sparkles, Trash2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { User } from "@supabase/supabase-js";
import { useAuth } from "./hooks/useAuth";
import { AuthScreen } from "./components/AuthScreen";
import { ConfigurationRequired } from "./components/ConfigurationRequired";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import { Loader2, LogOut } from "lucide-react";
import { PasswordRecovery } from "./components/PasswordRecovery";
import { SidebarAccordion } from "./components/SidebarAccordion";

const FOOTER_BANNER_URL =
  "https://firebasestorage.googleapis.com/v0/b/sistema-catalogo-digitales.firebasestorage.app/o/exec-29aa84c2-2a46-4a37-a1d1-94359a2a98c1.png?alt=media&token=694801fa-6aaa-475b-be12-dc9b493fc10d";

const CatalogApp: React.FC<{ user: User }> = ({ user }) => {
  const {
    storeInfo,
    products,
    plan,
    updateStoreInfo,
    addProduct,
    updateProduct,
    removeProduct,
    clearAll,
    loading,
    error,
  } = useCatalog(user);

  const [viewMode, setViewMode] = useState<ViewMode>("editor");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const closeSettingsRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!settingsOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSettingsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.requestAnimationFrame(() => closeSettingsRef.current?.focus());
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [settingsOpen]);

  const handleTemplateSelect = (id: TemplateId) => {
    updateStoreInfo({ templateId: id });
  };

  const handlePdfProductsPerPageChange = (value: number) => {
    updateStoreInfo({ pdfProductsPerPage: value } as any);
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
            <span className="hidden rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700 md:inline">{plan.name}</span><LogOut className="h-4 w-4"/><span className="hidden md:inline">Salir</span>
          </button>
        </div>
      </header>

      {error && <div role="alert" className="mx-auto mt-4 max-w-6xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">No se pudo sincronizar: {error}</div>}

      {/* Content Area */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {viewMode === "editor" ? (
            <motion.div
              key="editor"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="w-full"
            >
              {false && (
              <div className="hidden">
                <TemplateSelector
                  selectedId={storeInfo.templateId}
                  onSelect={handleTemplateSelect}
                  pdfProductsPerPage={
                    (storeInfo as any).pdfProductsPerPage ?? 4
                  }
                  onPdfProductsPerPageChange={handlePdfProductsPerPageChange}
                  advancedLayouts={plan.advancedLayouts}
                />

                <StoreForm storeInfo={storeInfo} onUpdate={updateStoreInfo} canCustomize={plan.customization} />

                <SidebarAccordion
                  title="Herramientas externas"
                  summary="Optimiza y convierte tu catálogo"
                  icon={Sparkles}
                  tone="info"
                >
                  <div className="space-y-4 text-sm text-blue-700 leading-relaxed">
                    <div>
                      <p className="font-semibold text-blue-900">
                        Optimizar o comprimir PDF
                      </p>
                      <p>
                        Usa iLovePDF para reducir el peso de tu catálogo antes
                        de compartirlo.
                      </p>
                      <a
                        href="https://www.ilovepdf.com/es/comprimir_pdf"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-1 font-semibold text-blue-600 hover:text-blue-800 underline"
                      >
                        Comprimir PDF gratis
                      </a>
                    </div>

                    <div>
                      <p className="font-semibold text-blue-900">
                        Crear catálogo digital
                      </p>
                      <p>
                        Usa Heyzine para convertir tu PDF en un catálogo digital
                        interactivo. Para usar esta herramienta debes crear una
                        cuenta gratuita.
                      </p>
                      <a
                        href="https://heyzine.com/es"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-1 font-semibold text-blue-600 hover:text-blue-800 underline"
                      >
                        Crear catálogo digital
                      </a>
                    </div>
                  </div>
                </SidebarAccordion>
              </div>
              )}

              <div className="w-full">
                <ProductManager
                  products={products}
                  plan={plan}
                  currency={storeInfo.whatsappCountryCode === "52" ? "MXN" : "COP"}
                  onAdd={addProduct}
                  onRemove={removeProduct}
                  onUpdate={updateProduct}
                  headerAction={(
                    <button
                      type="button"
                      onClick={() => setSettingsOpen(true)}
                      className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      <Settings2 className="h-4 w-4" />
                      <span className="hidden sm:inline">Configurar catálogo</span>
                      <span className="sm:hidden">Configurar</span>
                    </button>
                  )}
                />
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
                  Vista previa del catálogo
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

      <AnimatePresence>
        {settingsOpen && (
          <div className="fixed inset-0 z-[70]" role="presentation">
            <motion.button
              type="button"
              aria-label="Cerrar configuración"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSettingsOpen(false)}
              className="absolute inset-0 h-full w-full cursor-default bg-slate-950/35 backdrop-blur-[2px]"
            />

            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-labelledby="catalog-settings-title"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 360, damping: 36 }}
              className="absolute inset-y-0 left-0 flex w-full max-w-[440px] flex-col bg-slate-50 shadow-2xl"
            >
              <div className="flex h-18 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
                    <Settings2 className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h2 id="catalog-settings-title" className="font-bold text-slate-900">
                      Configurar catálogo
                    </h2>
                    <p className="truncate text-xs text-slate-500">
                      Diseño, tienda y opciones del PDF
                    </p>
                  </div>
                </div>
                <button
                  ref={closeSettingsRef}
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  aria-label="Cerrar configuración"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-5">
                <TemplateSelector
                  selectedId={storeInfo.templateId}
                  onSelect={handleTemplateSelect}
                  pdfProductsPerPage={(storeInfo as any).pdfProductsPerPage ?? 4}
                  onPdfProductsPerPageChange={handlePdfProductsPerPageChange}
                  advancedLayouts={plan.advancedLayouts}
                />
                <StoreForm storeInfo={storeInfo} onUpdate={updateStoreInfo} canCustomize={plan.customization} />
                <SidebarAccordion
                  title="Herramientas externas"
                  summary="Optimiza y convierte tu catálogo"
                  icon={Sparkles}
                  tone="info"
                >
                  <div className="space-y-5 text-sm leading-relaxed text-blue-700">
                    <div>
                      <p className="font-semibold text-blue-950">Optimizar o comprimir PDF</p>
                      <p>Reduce el peso de tu catálogo antes de compartirlo.</p>
                      <a href="https://www.ilovepdf.com/es/comprimir_pdf" target="_blank" rel="noopener noreferrer" className="mt-1 inline-block font-semibold text-blue-600 underline hover:text-blue-800">
                        Comprimir PDF gratis
                      </a>
                    </div>
                    <div>
                      <p className="font-semibold text-blue-950">Crear catálogo digital</p>
                      <p>Convierte tu PDF en un catálogo digital interactivo.</p>
                      <a href="https://heyzine.com/es" target="_blank" rel="noopener noreferrer" className="mt-1 inline-block font-semibold text-blue-600 underline hover:text-blue-800">
                        Abrir Heyzine
                      </a>
                    </div>
                  </div>
                </SidebarAccordion>
              </div>

              <div className="shrink-0 border-t border-slate-200 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <button
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  className="h-11 w-full rounded-xl bg-blue-600 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                >
                  Listo
                </button>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

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
    </div>
  );
};

export const App: React.FC<{ registrationToken?: string }> = ({ registrationToken = "" }) => {
  const { user, loading, passwordRecovery, finishPasswordRecovery } = useAuth();
  if (!isSupabaseConfigured) return <ConfigurationRequired />;
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-950"><Loader2 className="h-8 w-8 animate-spin text-white" /></div>;
  if (passwordRecovery) return <PasswordRecovery onDone={finishPasswordRecovery} />;
  return user ? <CatalogApp user={user} /> : <AuthScreen initialRegistrationToken={registrationToken} />;
};
