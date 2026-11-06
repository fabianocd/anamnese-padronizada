import { z } from "zod";

export const NOTE_LIMITS = { title: 160, content: 100000 } as const;

/** Nome mostrado quando a nota ainda não tem título. */
export const UNTITLED_NOTE = "Sem título";

export const saveNoteInputSchema = z.object({
  id: z.uuid(),
  title: z
    .string()
    .trim()
    .max(NOTE_LIMITS.title, `Título muito longo (máx. ${NOTE_LIMITS.title} caracteres).`),
  content: z
    .string()
    .max(NOTE_LIMITS.content, `Texto muito longo (máx. ${NOTE_LIMITS.content} caracteres).`),
});

export type SaveNoteInput = z.infer<typeof saveNoteInputSchema>;
