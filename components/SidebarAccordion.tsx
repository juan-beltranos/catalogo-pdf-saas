"use client";

import React, { useId, useState } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";

interface SidebarAccordionProps {
  title: string;
  summary?: string;
  icon: LucideIcon;
  children: React.ReactNode;
  defaultOpen?: boolean;
  tone?: "default" | "info";
}

export const SidebarAccordion: React.FC<SidebarAccordionProps> = ({
  title,
  summary,
  icon: Icon,
  children,
  defaultOpen = false,
  tone = "default",
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentId = useId();
  const infoTone = tone === "info";

  return (
    <section
      className={`mb-4 overflow-hidden rounded-2xl border shadow-sm transition-colors ${
        infoTone ? "border-blue-100 bg-blue-50" : "border-slate-200 bg-white"
      }`}
    >
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={() => setIsOpen((current) => !current)}
        className={`group flex min-h-16 w-full items-center gap-3 px-5 py-4 text-left outline-none transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 ${
          infoTone ? "hover:bg-blue-100/60" : ""
        }`}
      >
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${infoTone ? "bg-white text-blue-700" : "bg-blue-50 text-blue-600"}`}>
          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block text-sm font-bold ${infoTone ? "text-blue-950" : "text-slate-900"}`}>
            {title}
          </span>
          {summary && (
            <span className={`mt-0.5 block truncate text-xs ${infoTone ? "text-blue-700" : "text-slate-500"}`}>
              {summary}
            </span>
          )}
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-blue-600" : "text-slate-400"
          }`}
          aria-hidden="true"
        />
      </button>

      <div
        id={contentId}
        className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className={`border-t px-5 pb-5 pt-4 ${infoTone ? "border-blue-100" : "border-slate-100"}`}>
            {children}
          </div>
        </div>
      </div>
    </section>
  );
};
