import { z } from "zod";
import type { TemplateDraft } from "./schema";

/** Rota que lê a ficha enviada e devolve o rascunho do modelo. */
export const EXTRACT_ENDPOINT = "/api/modelos/extrair";

export const extractRequestSchema = z.object({
  uploadId: z.uuid(),
});

export type ExtractRequest = z.infer<typeof extractRequestSchema>;

export type ExtractResponse =
  | { ok: true; draft: TemplateDraft }
  | { ok: false; code: string; message: string };

/** Página onde o rascunho (da IA ou manual) é revisado. */
export const REVIEW_PATH = "/modelos/novo/revisar";
