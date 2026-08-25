import React, { useEffect, useState } from "react";
import { AlertTriangle, Image as ImageIcon } from "lucide-react";
import { lookupImage } from "@/helper/imageDB";
import { Product } from "../types";

type Props = {
  product: Product;
  className?: string;
};

type LoadState = "loading" | "ready" | "empty" | "missing" | "error";

export const ProductThumb: React.FC<Props> = ({ product, className }) => {
  const [src, setSrc] = useState("");
  const [state, setState] = useState<LoadState>("loading");

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    setSrc("");
    setState("loading");

    const load = async () => {
      if (product.image) {
        if (!active) return;
        setSrc(product.image);
        setState("ready");
        return;
      }

      if (!product.imageId) {
        if (active) setState(product.imageUnavailable ? "missing" : "empty");
        return;
      }

      const result = await lookupImage(product.imageId);
      if (!active) return;

      if (result.status === "available") {
        objectUrl = URL.createObjectURL(result.blob);
        setSrc(objectUrl);
        setState("ready");
      } else {
        setState(result.status === "missing" ? "missing" : "error");
      }
    };

    void load();
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [product.image, product.imageId, product.imageUnavailable]);

  const handleError = () => {
    // External URLs can expire; Blob URLs can also fail to decode if corrupted.
    setSrc("");
    setState(product.imageId && !product.image ? "missing" : "error");
  };

  return (
    <div className="w-full h-full relative flex items-center justify-center">
      {state === "ready" && src ? (
        <img
          src={src}
          alt={product.name}
          data-imgid={product.imageId ?? ""}
          className={className ?? "w-full h-full object-contain block"}
          onError={handleError}
        />
      ) : null}

      {state !== "ready" && state !== "loading" ? (
        <div
          className="absolute inset-0 flex flex-col gap-1 items-center justify-center text-center text-slate-400 bg-slate-50 px-1"
          title={state === "missing" ? "El archivo local de esta imagen ya no existe" : undefined}
        >
          {state === "missing" || state === "error" ? (
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          ) : (
            <ImageIcon className="w-6 h-6" />
          )}
          <span className="text-[9px] leading-tight font-semibold">
            {state === "missing"
              ? "Imagen no recuperable"
              : state === "error"
                ? "Imagen no disponible"
                : "Sin foto"}
          </span>
        </div>
      ) : null}
    </div>
  );
};
