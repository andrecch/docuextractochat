import { MAX_TEXT_BYTES, preparePreview } from "../file-preview/files";
import type { LocalPreview, FileKind } from "../file-preview/files";

export type Sensitivity = "unknown" | "sensitive" | "non-sensitive";
export type DocumentRecord = {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  kind: FileKind;
  extension: string;
  hash: string;
  sensitivity: Sensitivity;
  createdAt: string;
};
export type DocumentPage = {
  items: DocumentRecord[];
  total: number;
  page: number;
  limit: number;
};
export class LibraryError extends Error {
  constructor(
    message: string,
    public documentId?: string,
  ) {
    super(message);
  }
}
export const documentUrl = (id: string, action: string) =>
  `/api/documents/${encodeURIComponent(id)}/${action}`;
export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    throw new LibraryError(
      "Biblioteca no disponible. Comprueba que el servicio local esté iniciado e intenta otra vez.",
    );
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new LibraryError(
      typeof data.message === "string"
        ? data.message
        : "Biblioteca no disponible. Intenta otra vez.",
      data.documentId,
    );
  }
  if (response.status === 204) return undefined as T;
  try {
    return (await response.json()) as T;
  } catch {
    throw new LibraryError("Biblioteca no disponible. Intenta otra vez.");
  }
}
export async function storedPreview(
  record: DocumentRecord,
  signal: AbortSignal,
): Promise<LocalPreview> {
  const file = new File([], record.name, { type: record.mimeType });
  const base = {
    file,
    originalSize: record.size,
    documentId: record.id,
    kind: record.kind,
    label: record.extension.toUpperCase(),
    truncated: false,
  };
  if (record.kind === "docx") {
    const result = await api<{ html: string; warnings: string[] }>(
      documentUrl(record.id, "preview"),
      { signal },
    );
    return { ...base, ...result, url: documentUrl(record.id, "download") };
  }
  if (record.kind !== "text") {
    // Native viewers stream the original without duplicating it into JavaScript memory.
    return { ...base, url: documentUrl(record.id, "file") };
  }
  const response = await fetch(documentUrl(record.id, "file"), { signal });
  if (!response.ok || !response.body)
    throw new LibraryError(
      "No se pudo abrir el documento guardado. Intenta otra vez.",
    );
  const reader = response.body.getReader();
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let size = 0;
  try {
    while (size < MAX_TEXT_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      const bounded = value.slice(0, MAX_TEXT_BYTES - size);
      chunks.push(bounded);
      size += bounded.byteLength;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  const next = await preparePreview(
    new File(chunks, record.name, { type: record.mimeType }),
  );
  return {
    ...next,
    originalSize: record.size,
    documentId: record.id,
    truncated: record.size > MAX_TEXT_BYTES,
  };
}
