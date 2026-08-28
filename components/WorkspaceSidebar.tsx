"use client";

import React from "react";
import {
  Boxes,
  ChevronRight,
  CreditCard,
  FileStack,
  LayoutTemplate,
  LockKeyhole,
  Menu,
  Package,
  Sparkles,
  Store,
  X,
  type LucideIcon,
} from "lucide-react";

export type WorkspaceModule =
  | "catalogs"
  | "products"
  | "design"
  | "store"
  | "tools"
  | "plan";

interface NavigationItem {
  id: WorkspaceModule;
  label: string;
  description: string;
  icon: LucideIcon;
  locked?: boolean;
}

interface WorkspaceSidebarProps {
  activeModule: WorkspaceModule;
  onChange: (module: WorkspaceModule) => void;
  planName: string;
  toolsEnabled: boolean;
  catalogName?: string;
}

export const WorkspaceSidebar: React.FC<WorkspaceSidebarProps> = ({
  activeModule,
  onChange,
  planName,
  toolsEnabled,
  catalogName,
}) => {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const items: NavigationItem[] = [
    { id: "catalogs", label: "Mis catálogos", description: "Ediciones y biblioteca", icon: FileStack },
    { id: "products", label: "Productos", description: "Productos y categorías", icon: Package },
    { id: "design", label: "Diseño del PDF", description: "Plantilla y distribución", icon: LayoutTemplate },
    { id: "store", label: "Mi tienda", description: "Marca y datos de contacto", icon: Store },
    { id: "tools", label: "Herramientas", description: "Optimiza y comparte", icon: Sparkles, locked: !toolsEnabled },
    { id: "plan", label: "Plan y suscripción", description: "Uso y beneficios", icon: CreditCard },
  ];
  const activeItem = items.find((item) => item.id === activeModule) ?? items[0];

  const selectModule = (module: WorkspaceModule) => {
    onChange(module);
    setMobileOpen(false);
  };

  const navigation = (
    <>
      <div className="border-b border-slate-200 px-4 py-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-600 text-white">
            <Boxes className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Catálogo activo</p>
            <p className="truncate text-sm font-bold text-slate-900">{catalogName || "Catálogo principal"}</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3" aria-label="Módulos del catálogo">
        {items.map(({ id, label, description, icon: Icon, locked }) => {
          const active = id === activeModule;
          return (
            <button
              key={id}
              type="button"
              onClick={() => selectModule(id)}
              aria-current={active ? "page" : undefined}
              className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
                active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon className={`h-5 w-5 shrink-0 ${active ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"}`} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  {label}
                  {locked && <LockKeyhole className="h-3.5 w-3.5 text-amber-500" aria-label="Requiere suscripción" />}
                </span>
                <span className="mt-0.5 block truncate text-xs text-slate-400">{description}</span>
              </span>
              <ChevronRight className={`h-4 w-4 shrink-0 ${active ? "text-blue-500" : "text-slate-300"}`} />
            </button>
          );
        })}
      </nav>
      <div className="border-t border-slate-200 p-4">
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-500">Plan actual</span>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">{planName}</span>
          </div>
          <button type="button" onClick={() => selectModule("plan")} className="mt-2 text-xs font-bold text-blue-600 hover:text-blue-800">
            Ver beneficios del plan
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      <div className="mb-4 lg:hidden">
        <button type="button" onClick={() => setMobileOpen(true)} className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm">
          <Menu className="h-5 w-5 text-blue-600" />
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-medium text-slate-400">Sección actual</span>
            <span className="block truncate text-sm font-bold text-slate-900">{activeItem.label}</span>
          </span>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </button>
      </div>

      <aside className="sticky top-24 hidden h-[calc(100vh-7rem)] w-64 shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:flex">
        {navigation}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <button type="button" aria-label="Cerrar menú" onClick={() => setMobileOpen(false)} className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]" />
          <aside className="absolute inset-y-0 left-0 flex w-[min(88vw,340px)] flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <p className="font-bold text-slate-900">Módulos</p>
              <button type="button" onClick={() => setMobileOpen(false)} aria-label="Cerrar menú" className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            {navigation}
          </aside>
        </div>
      )}
    </>
  );
};
