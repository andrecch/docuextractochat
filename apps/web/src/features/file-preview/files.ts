export const MAX_FILE_BYTES = 50 * 1024 * 1024;
export const MAX_TEXT_BYTES = 1024 * 1024;
export const ACCEPTED_FILES = ".pdf,.png,.jpg,.jpeg,.txt,.md,.markdown";

export type FileKind = "pdf" | "image" | "text";
export type LocalPreview = {
  file: File;
  kind: FileKind;
  label: string;
  url: string;
  text?: string;
  truncated: boolean;
};

const extensions: Record<string, { kind: FileKind; label: string }> = {
  pdf: { kind: "pdf", label: "PDF" },
  png: { kind: "image", label: "PNG" },
  jpg: { kind: "image", label: "JPEG" },
  jpeg: { kind: "image", label: "JPEG" },
  txt: { kind: "text", label: "TXT" },
  md: { kind: "text", label: "Markdown" },
  markdown: { kind: "text", label: "Markdown" },
};

export function fileType(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (extension === "docx")
    throw new Error(
      "La vista de DOCX llegará en la fase 2. Por ahora, selecciona un PDF, una imagen o un archivo de texto.",
    );
  const type = extensions[extension];
  if (!type)
    throw new Error(
      "Formato no admitido. Selecciona PDF, PNG, JPEG, TXT o Markdown.",
    );
  if (!file.size)
    throw new Error(
      "El archivo está vacío. Selecciona uno que tenga contenido.",
    );
  if (file.size > MAX_FILE_BYTES)
    throw new Error(
      "El archivo supera los 50 MB. Selecciona un archivo más pequeño.",
    );
  return type;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const unit = bytes < 1024 * 1024 ? "KB" : "MB";
  const value = unit === "KB" ? bytes / 1024 : bytes / (1024 * 1024);
  return `${new Intl.NumberFormat("es", { maximumFractionDigits: 1 }).format(value)} ${unit}`;
}

async function validateSignature(file: File, label: string) {
  const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const valid =
    label === "PDF"
      ? new TextDecoder().decode(bytes).startsWith("%PDF-")
      : label === "PNG"
        ? [137, 80, 78, 71, 13, 10, 26, 10].every(
            (byte, index) => bytes[index] === byte,
          )
        : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (!valid)
    throw new Error(
      `El contenido no corresponde a un archivo ${label} válido. Comprueba el archivo o selecciona otro.`,
    );
}

function validateImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const release = () => {
      image.onload = null;
      image.onerror = null;
      image.src = "";
    };
    image.onload = () => {
      const pixels = image.naturalWidth * image.naturalHeight;
      release();
      if (pixels > 40_000_000)
        reject(
          new Error(
            "La imagen tiene más de 40 megapíxeles. Usa una versión reducida para mantener la vista ligera.",
          ),
        );
      else resolve();
    };
    image.onerror = () => {
      release();
      reject(
        new Error(
          "No se pudo abrir la imagen. Comprueba que el archivo no esté dañado.",
        ),
      );
    };
    image.src = url;
  });
}

export async function preparePreview(file: File): Promise<LocalPreview> {
  const type = fileType(file);
  let previewFile: Blob = file;
  let text: string | undefined;
  if (type.kind === "text") {
    const buffer = await file.slice(0, MAX_TEXT_BYTES).arrayBuffer();
    text = new TextDecoder("utf-8").decode(buffer);
    if (text.includes("\0"))
      throw new Error(
        "El archivo contiene datos binarios. Selecciona texto en formato UTF-8.",
      );
    // Even the open-in-tab action uses the bounded, inert text copy.
    previewFile = new Blob([text], { type: "text/plain;charset=utf-8" });
  } else {
    await validateSignature(file, type.label);
    previewFile = new Blob([file], {
      type:
        type.kind === "pdf"
          ? "application/pdf"
          : type.label === "PNG"
            ? "image/png"
            : "image/jpeg",
    });
  }
  const url = URL.createObjectURL(previewFile);
  try {
    if (type.kind === "image") await validateImage(url);
    return {
      file,
      ...type,
      url,
      text,
      truncated: type.kind === "text" && file.size > MAX_TEXT_BYTES,
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}
