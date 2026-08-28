import { DeleteObjectCommand, DeleteObjectsCommand, GetObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const required = (name: string) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Falta configurar ${name}`);
  return value;
};

const r2 = () => new S3Client({
  region: "auto",
  endpoint: `https://${required("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: required("R2_ACCESS_KEY_ID"), secretAccessKey: required("R2_SECRET_ACCESS_KEY") },
});

async function authenticatedUser(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Falta configurar Supabase");
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.getUser(token);
  return error ? null : data.user;
}

export async function POST(request: NextRequest) {
  try {
    const user = await authenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
    const body = await request.json();
    const bucket = required("R2_BUCKET_NAME");
    const publicBaseUrl = required("R2_PUBLIC_BASE_URL").replace(/\/+$/, "");

    if (body.action === "sign-upload") {
      const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };
      const limits: Record<string, number> = { "image/jpeg": 5, "image/png": 5, "image/webp": 5, "application/pdf": 25 };
      const allowedKinds = new Set(["product", "logo", "header", "cover", "pdf"]);
      if (!allowedKinds.has(body.kind) || !extensions[body.contentType] || !Number.isInteger(body.size)) return NextResponse.json({ error: "Solicitud de carga inválida" }, { status: 400 });
      if (body.size <= 0 || body.size > limits[body.contentType] * 1024 * 1024) return NextResponse.json({ error: "El archivo supera el tamaño permitido" }, { status: 413 });
      const objectKey = `${user.id}/${body.kind}/${crypto.randomUUID()}.${extensions[body.contentType]}`;
      const uploadUrl = await getSignedUrl(r2(), new PutObjectCommand({ Bucket: bucket, Key: objectKey, ContentType: body.contentType }), { expiresIn: 300 });
      return NextResponse.json({ key: objectKey, url: `${publicBaseUrl}/${objectKey}`, uploadUrl, expiresIn: 300 });
    }

    if (body.action === "delete-product-images") {
      const client = r2();
      const prefix = `${user.id}/product/`;
      let continuationToken: string | undefined;
      let count = 0;
      do {
        const listed = await client.send(new ListObjectsV2Command({
          Bucket: bucket, Prefix: prefix, ContinuationToken: continuationToken,
        }));
        const objects = (listed.Contents || []).flatMap((object) => object.Key ? [{ Key: object.Key }] : []);
        if (objects.length) {
          const deleted = await client.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: objects, Quiet: true } }));
          if (deleted.Errors?.length) throw new Error(`R2 no pudo borrar ${deleted.Errors.length} archivo(s).`);
          count += objects.length;
        }
        continuationToken = listed.IsTruncated ? listed.NextContinuationToken : undefined;
      } while (continuationToken);
      return NextResponse.json({ deleted: true, count });
    }

    if (body.action === "delete-many") {
      if (!Array.isArray(body.keys) || body.keys.length > 1000) {
        return NextResponse.json({ error: "Lista de archivos inválida" }, { status: 400 });
      }
      const keys = [...new Set(body.keys as unknown[])];
      if (keys.some((key) => typeof key !== "string" || key.includes(".."))) {
        return NextResponse.json({ error: "Operación no autorizada" }, { status: 403 });
      }
      // Migrated products may carry an old IndexedDB/Cloudinary id in
      // image_key. Skip those legacy ids while keeping the R2 boundary strict.
      const validatedKeys = (keys as string[]).filter((key) => key.startsWith(`${user.id}/`));
      if (!validatedKeys.length) return NextResponse.json({ deleted: true, count: keys.length, skipped: keys.length });
      const result = await r2().send(new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: validatedKeys.map((Key) => ({ Key })), Quiet: true },
      }));
      if (result.Errors?.length) {
        console.error("R2 bulk delete returned errors", result.Errors);
        return NextResponse.json({ error: `R2 no pudo borrar ${result.Errors.length} archivo(s).` }, { status: 502 });
      }
      return NextResponse.json({ deleted: true, count: keys.length, skipped: keys.length - validatedKeys.length });
    }

    if (body.action === "delete") {
      if (typeof body.key !== "string" || !body.key.startsWith(`${user.id}/`)) return NextResponse.json({ error: "Operación no autorizada" }, { status: 403 });
      await r2().send(new DeleteObjectCommand({ Bucket: bucket, Key: body.key }));
      return NextResponse.json({ deleted: true });
    }

    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  } catch (error) {
    console.error("R2 asset route failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error interno" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await authenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
    const objectKey = request.nextUrl.searchParams.get("key");
    if (!objectKey || !objectKey.startsWith(`${user.id}/`)) return NextResponse.json({ error: "Operación no autorizada" }, { status: 403 });

    const contentType = request.headers.get("content-type")?.split(";")[0] || "";
    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
    if (!allowedTypes.has(contentType)) return NextResponse.json({ error: "Tipo de archivo no permitido" }, { status: 415 });
    const bytes = new Uint8Array(await request.arrayBuffer());
    const maxBytes = contentType === "application/pdf" ? 25 * 1024 * 1024 : 5 * 1024 * 1024;
    if (!bytes.length || bytes.length > maxBytes) return NextResponse.json({ error: "El archivo supera el tamaño permitido" }, { status: 413 });

    const validSignature = contentType === "image/jpeg"
      ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
      : contentType === "image/png"
        ? bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
        : contentType === "image/webp"
          ? bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
          : bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
    if (!validSignature) return NextResponse.json({ error: "El contenido del archivo no coincide con su formato" }, { status: 400 });

    await r2().send(new PutObjectCommand({ Bucket: required("R2_BUCKET_NAME"), Key: objectKey, Body: bytes, ContentType: contentType }));
    return NextResponse.json({ uploaded: true, mode: "server-fallback" });
  } catch (error) {
    console.error("R2 fallback upload failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error interno" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await authenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
    const sourceUrl = request.nextUrl.searchParams.get("url") || "";
    const publicBaseUrl = required("R2_PUBLIC_BASE_URL").replace(/\/+$/, "");
    const expectedPrefix = `${publicBaseUrl}/${user.id}/`;
    if (!sourceUrl.startsWith(expectedPrefix)) return NextResponse.json({ error: "Archivo no autorizado" }, { status: 403 });
    const objectKey = decodeURIComponent(sourceUrl.slice(publicBaseUrl.length + 1));
    if (!objectKey.startsWith(`${user.id}/`) || objectKey.includes("..")) return NextResponse.json({ error: "Ruta inválida" }, { status: 400 });

    const result = await r2().send(new GetObjectCommand({ Bucket: required("R2_BUCKET_NAME"), Key: objectKey }));
    if (!result.Body) return NextResponse.json({ error: "Archivo vacío" }, { status: 404 });
    const bytes = await result.Body.transformToByteArray();
    return new NextResponse(bytes, { headers: {
      "Content-Type": result.ContentType || "application/octet-stream",
      "Cache-Control": "private, max-age=3600",
      "Content-Length": String(bytes.byteLength),
    } });
  } catch (error) {
    console.error("R2 read fallback failed", error);
    return NextResponse.json({ error: "No fue posible recuperar el archivo" }, { status: 500 });
  }
}
