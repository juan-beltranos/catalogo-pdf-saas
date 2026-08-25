import React from "react";
import { MessageCircle } from "lucide-react";

const SUPPORT_WHATSAPP_URL = "https://wa.me/573054764557";

export const WhatsAppSupportButton: React.FC = () => (
  <a
    href={SUPPORT_WHATSAPP_URL}
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Contactar soporte por WhatsApp"
    title="Soporte por WhatsApp"
    className="fixed bottom-5 right-5 z-[80] flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl shadow-emerald-950/20 transition hover:scale-105 hover:bg-[#20bd5a] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300 sm:bottom-6 sm:right-6"
  >
    <MessageCircle className="h-7 w-7" aria-hidden="true" />
  </a>
);
