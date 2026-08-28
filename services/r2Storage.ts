import { supabase } from "../lib/supabase";

export type UploadedAsset = { key: string; url: string };

const fetchWithTimeout = async (input: RequestInfo | URL, init: RequestInit, timeoutMs: number) => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
};

async function callAssetApi(body: Record<string, unknown>) {
  if (!supabase) throw new Error("Supabase no está configurado.");
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Tu sesión expiró. Inicia sesión nuevamente.");
  const response = await fetchWithTimeout("/api/assets", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  }, 12_000);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "No fue posible autorizar la operación en R2.");
  return data;
}

function dataUrlToUpload(dataUrl: string) {
  const match = /^data:([^;,]+);base64,(.+)$/s.exec(dataUrl);
  if (!match) throw new Error("La imagen no tiene un formato válido.");
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return { contentType: match[1], blob: new Blob([bytes], { type: match[1] }) };
}

export async function uploadCatalogImage(dataUrl: string, kind: "product" | "logo" | "header" | "cover"): Promise<UploadedAsset> {
  const { contentType, blob } = dataUrlToUpload(dataUrl);
  const data = await callAssetApi({ action: "sign-upload", kind, contentType, size: blob.size });
  if (!data?.key || !data?.url || !data?.uploadUrl) throw new Error("R2 no devolvió una autorización de carga.");
  try {
    const upload = await fetchWithTimeout(data.uploadUrl, { method: "PUT", headers: { "Content-Type": contentType }, body: blob }, 6_000);
    if (!upload.ok) throw new Error(`R2 rechazó la carga (${upload.status}).`);
  } catch (directUploadError) {
    const { data: sessionData } = await supabase!.auth.getSession();
    const token = sessionData.session?.access_token;
    const fallback = await fetchWithTimeout(`/api/assets?key=${encodeURIComponent(data.key)}`, {
      method: "PUT",
      headers: { "Content-Type": contentType, Authorization: `Bearer ${token}` },
      body: blob,
    }, 20_000);
    if (!fallback.ok) {
      const details = await fallback.json().catch(() => ({}));
      throw new Error(details.error || (directUploadError instanceof Error ? directUploadError.message : "No fue posible subir la imagen."));
    }
  }
  return { key: data.key, url: data.url };
}

export async function deleteCatalogImage(key?: string): Promise<void> {
  if (!key) return;
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const result = await callAssetApi({ action: "delete", key });
      if (result?.deleted !== true) throw new Error("R2 no confirmó la eliminación.");
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => window.setTimeout(resolve, attempt * 350));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("No fue posible eliminar la imagen de R2.");
}

export async function fetchCatalogAssetBlob(sourceUrl: string, signal?: AbortSignal): Promise<Blob> {
  try {
    const direct = await fetch(sourceUrl, { mode: "cors", credentials: "omit", cache: "force-cache", signal });
    if (!direct.ok) throw new Error(`R2 respondió ${direct.status}`);
    return await direct.blob();
  } catch (directError) {
    if (signal?.aborted) throw directError;
    if (!supabase) throw directError;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) throw directError;
    const proxy = await fetch(`/api/assets?url=${encodeURIComponent(sourceUrl)}`, {
      headers: { Authorization: `Bearer ${token}` }, cache: "force-cache", signal,
    });
    if (!proxy.ok) throw new Error(`No fue posible recuperar una imagen para el PDF (${proxy.status}).`);
    return await proxy.blob();
  }
}
