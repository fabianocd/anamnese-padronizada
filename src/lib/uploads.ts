/**
 * Regras de envio da ficha (decisão 7 do PLANO): 1 PDF ou até 10 imagens,
 * no máximo 20 MB no total. Usado no client (antes de enviar) e no servidor.
 */

/** Bucket privado dos arquivos enviados (pastas `{user_id}/...`). */
export const DOCS_BUCKET = "anamneses-docs";

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
export const MAX_IMAGES = 10;

export const PDF_MIME = "application/pdf";
export const IMAGE_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

export const ACCEPT_ATTRIBUTE = [PDF_MIME, ...IMAGE_MIMES, ".pdf", ".heic", ".heif"].join(",");

const EXTENSION_MIMES: Record<string, string> = {
  pdf: PDF_MIME,
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
};

const MIME_EXTENSIONS: Record<string, string> = {
  [PDF_MIME]: "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

export type UploadKind = "pdf" | "images";

/**
 * Tipo do arquivo pelo MIME ou, se o navegador não informar (comum com HEIC),
 * pela extensão. Devolve null quando não é aceito.
 */
export function resolveMime(name: string, type: string): string | null {
  const normalized = type.toLowerCase();
  if (normalized === PDF_MIME || (IMAGE_MIMES as readonly string[]).includes(normalized)) {
    return normalized;
  }
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_MIMES[extension] ?? null;
}

export function extensionForMime(mime: string): string {
  return MIME_EXTENSIONS[mime] ?? "bin";
}

type FileLike = { name: string; type: string; size: number };

export type UploadCheck =
  | { ok: true; kind: UploadKind; mimes: string[] }
  | { ok: false; message: string };

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

/** Confere quantidade, tipos e tamanho total dos arquivos escolhidos. */
export function checkUpload(files: FileLike[]): UploadCheck {
  if (files.length === 0) return { ok: false, message: "Escolha um PDF ou fotos da ficha." };

  const mimes: string[] = [];
  for (const file of files) {
    const mime = resolveMime(file.name, file.type);
    if (!mime) {
      return {
        ok: false,
        message: `"${file.name}" não é um formato aceito. Envie PDF, JPG, PNG, WebP ou HEIC.`,
      };
    }
    if (file.size === 0) return { ok: false, message: `"${file.name}" está vazio.` };
    mimes.push(mime);
  }

  const pdfCount = mimes.filter((mime) => mime === PDF_MIME).length;
  if (pdfCount > 0 && files.length > 1) {
    return {
      ok: false,
      message: "Envie 1 PDF sozinho ou só imagens (até 10). Não misture PDF com fotos.",
    };
  }
  if (pdfCount === 0 && files.length > MAX_IMAGES) {
    return { ok: false, message: `Envie no máximo ${MAX_IMAGES} imagens.` };
  }

  const total = files.reduce((sum, file) => sum + file.size, 0);
  if (total > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      message: `Os arquivos somam ${formatBytes(total)}. O limite é ${formatBytes(MAX_UPLOAD_BYTES)}.`,
    };
  }

  return { ok: true, kind: pdfCount === 1 ? "pdf" : "images", mimes };
}

/** Pasta de um envio no bucket. Sempre começa pelo id do usuário (policies de storage). */
export function sourceFolder(userId: string, uploadId: string): string {
  return `${userId}/sources/${uploadId}`;
}
