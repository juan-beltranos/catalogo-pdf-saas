const DB_NAME = "instacatalog_db";
const IMAGE_STORE = "images";
const META_STORE = "metadata";
const DB_VERSION = 2;

export type ImageLookup =
  | { status: "available"; blob: Blob }
  | { status: "missing" }
  | { status: "unavailable"; error: unknown };

let databasePromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        // Never delete/recreate the original store: v1 Blobs remain readable.
        if (!db.objectStoreNames.contains(IMAGE_STORE)) {
          db.createObjectStore(IMAGE_STORE);
        }
        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE);
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          databasePromise = null;
        };
        resolve(db);
      };
      request.onerror = () => {
        databasePromise = null;
        reject(request.error);
      };
      request.onblocked = () => {
        console.warn("IndexedDB upgrade is blocked by another open tab.");
      };
    });
  }
  return databasePromise;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export function base64ToBlob(dataUrl: string): Blob {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(dataUrl);
  if (!match) throw new Error("Invalid data URL");

  const mime = match[1] || "application/octet-stream";
  const binary = match[2]
    ? atob(match[3].replace(/\s/g, ""))
    : decodeURIComponent(match[3]);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mime });
}

export async function putImageBlob(imageId: string, blob: Blob): Promise<void> {
  if (!imageId || !(blob instanceof Blob) || blob.size === 0) {
    throw new Error("Cannot persist an empty image");
  }
  const db = await openDB();
  const transaction = db.transaction(IMAGE_STORE, "readwrite");
  transaction.objectStore(IMAGE_STORE).put(blob, imageId);
  await transactionDone(transaction);
}

export async function putImageFromBase64(imageId: string, dataUrl: string): Promise<void> {
  await putImageBlob(imageId, base64ToBlob(dataUrl));
}

export async function lookupImage(imageId: string): Promise<ImageLookup> {
  if (!imageId) return { status: "missing" };
  try {
    const db = await openDB();
    const transaction = db.transaction(IMAGE_STORE, "readonly");
    const value = await requestResult<unknown>(
      transaction.objectStore(IMAGE_STORE).get(imageId),
    );
    if (!(value instanceof Blob) || value.size === 0) return { status: "missing" };
    return { status: "available", blob: value };
  } catch (error) {
    return { status: "unavailable", error };
  }
}

export async function getImageBlob(imageId: string): Promise<Blob | null> {
  const result = await lookupImage(imageId);
  if (result.status === "unavailable") throw result.error;
  return result.status === "available" ? result.blob : null;
}

export async function getImageUrl(imageId: string): Promise<string | null> {
  const blob = await getImageBlob(imageId);
  return blob ? URL.createObjectURL(blob) : null;
}

export async function deleteImage(imageId: string): Promise<void> {
  if (!imageId) return;
  const db = await openDB();
  const transaction = db.transaction(IMAGE_STORE, "readwrite");
  transaction.objectStore(IMAGE_STORE).delete(imageId);
  await transactionDone(transaction);
}

export async function requestPersistentImageStorage(): Promise<boolean | null> {
  try {
    if (!navigator.storage?.persist) return null;
    if (await navigator.storage.persisted?.()) return true;
    return await navigator.storage.persist();
  } catch (error) {
    console.warn("Persistent browser storage could not be requested.", error);
    return false;
  }
}

export async function recordStorageCheck(): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(META_STORE, "readwrite");
    transaction.objectStore(META_STORE).put(
      { checkedAt: new Date().toISOString(), schemaVersion: DB_VERSION },
      "storage-health",
    );
    await transactionDone(transaction);
  } catch (error) {
    console.warn("IndexedDB health check failed.", error);
  }
}
