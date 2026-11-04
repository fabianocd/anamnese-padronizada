import { z } from "zod";

/** Tipos de campo aceitos no modelo (ver CLAUDE.md). */
export const FIELD_TYPES = [
  "short_text",
  "long_text",
  "yes_no",
  "number",
  "date",
  "select",
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  short_text: "Texto curto",
  long_text: "Texto longo",
  yes_no: "Sim/Não",
  number: "Número",
  date: "Data",
  select: "Lista de opções",
};

/** Siglas consagradas (decisão 5 do PLANO). As demais seções ficam por extenso. */
export const KNOWN_ABBREVIATIONS = ["ID", "QP", "HDA", "HPP", "HF", "HD", "DNPM"] as const;

export const LIMITS = {
  sections: 60,
  fieldsPerSection: 100,
  options: 50,
  title: 120,
  abbreviation: 12,
  label: 200,
  option: 120,
  hint: 400,
  templateTitle: 160,
} as const;

export const templateFieldSchema = z
  .object({
    id: z.string().min(1).max(64),
    label: z.string().trim().min(1, "Dê um nome ao campo.").max(LIMITS.label),
    type: z.enum(FIELD_TYPES),
    options: z.array(z.string().trim().min(1).max(LIMITS.option)).max(LIMITS.options).optional(),
    hint: z.string().trim().max(LIMITS.hint).optional(),
  })
  .refine((field) => field.type !== "select" || (field.options?.length ?? 0) > 0, {
    message: "Adicione pelo menos uma opção.",
    path: ["options"],
  });

export const templateSectionSchema = z.object({
  id: z.string().min(1).max(64),
  title: z.string().trim().min(1, "Dê um título à seção.").max(LIMITS.title),
  abbreviation: z.string().trim().max(LIMITS.abbreviation).optional(),
  /** Respostas da seção em uma linha só (ex.: `#ID: M.S., 2 ANOS, ...`). */
  singleLine: z.boolean().optional(),
  fields: z.array(templateFieldSchema).max(LIMITS.fieldsPerSection),
});

export const templateSchema = z.object({
  sections: z.array(templateSectionSchema).max(LIMITS.sections),
});

export type TemplateField = z.infer<typeof templateFieldSchema>;
export type TemplateSection = z.infer<typeof templateSectionSchema>;
export type Template = z.infer<typeof templateSchema>;

/** Rascunho de modelo (vindo da IA ou criado do zero), ainda não salvo. */
export const templateDraftSchema = z.object({
  title: z.string().trim().max(LIMITS.templateTitle),
  schema: templateSchema,
  /** Pasta do arquivo original no bucket (`{user_id}/sources/{uploadId}`). */
  sourceFilePath: z.string().max(200).optional(),
  origin: z.enum(["ai", "manual"]),
});

export type TemplateDraft = z.infer<typeof templateDraftSchema>;

export function newId(): string {
  return crypto.randomUUID();
}
