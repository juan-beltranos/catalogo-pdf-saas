"use client";

import React from "react";
import { ExternalLink, PlayCircle, X } from "lucide-react";

const TUTORIAL_URL = "https://youtu.be/nG_5zpVvQrU";
const TUTORIAL_EMBED_URL = "https://www.youtube-nocookie.com/embed/nG_5zpVvQrU?rel=0";

interface TutorialVideoDialogProps {
  open: boolean;
  onClose: () => void;
}

export const TutorialVideoDialog: React.FC<TutorialVideoDialogProps> = ({ open, onClose }) => {
  const closeButtonRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
      <button type="button" aria-label="Cerrar tutorial" onClick={onClose} className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
              <PlayCircle className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 id="tutorial-title" className="font-bold text-slate-900">Video tutorial</h2>
              <p className="mt-0.5 text-sm text-slate-500">Aprende a usar la plataforma paso a paso.</p>
            </div>
          </div>
          <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="Cerrar video tutorial" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="aspect-video bg-slate-950">
          <iframe
            className="h-full w-full"
            src={TUTORIAL_EMBED_URL}
            title="Tutorial para usar Catálogo Instantáneo"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>

        <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <p className="hidden text-xs text-slate-400 sm:block">Puedes pausar el video y continuar trabajando cuando quieras.</p>
          <a href={TUTORIAL_URL} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50 hover:text-blue-800">
            Abrir en YouTube <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </div>
    </div>
  );
};
