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

/*
 * Dois níveis de validação:
 * - "editável": formato do rascunho enquanto a pessoa edita (rótulos vazios,
 *   seção sem campos etc. são aceitos), usado no sessionStorage;
 * - estrito: o que pode ser salvo no banco (`templates.schema`).
 */

const editableFieldSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().max(LIMITS.label),
  type: z.enum(FIELD_TYPES),
  options: z.array(z.string().max(LIMITS.option)).max(LIMITS.options).optional(),
  hint: z.string().max(LIMITS.hint).optional(),
});

const editableSectionSchema = z.object({
  id: z.string().min(1).max(64),
  title: z.string().max(LIMITS.title),
  abbreviation: z.string().max(LIMITS.abbreviation).optional(),
  /** Respostas da seção em uma linha só (ex.: `#ID: M.S., 2 ANOS, ...`). */
  singleLine: z.boolean().optional(),
  fields: z.array(editableFieldSchema).max(LIMITS.fieldsPerSection),
});

export const editableTemplateSchema = z.object({
  sections: z.array(editableSectionSchema).max(LIMITS.sections),
});

export const templateFieldSchema = editableFieldSchema
  .extend({
    label: z.string().trim().min(1, "Dê um nome ao campo.").max(LIMITS.label),
    options: z
      .array(z.string().trim().min(1, "Opção vazia.").max(LIMITS.option))
      .max(LIMITS.options, `No máximo ${LIMITS.options} opções.`)
      .optional(),
    hint: z.string().trim().max(LIMITS.hint).optional(),
  })
  .refine((field) => field.type !== "select" || (field.options?.length ?? 0) > 0, {
    message: "Adicione pelo menos uma opção.",
    path: ["options"],
  });

export const templateSectionSchema = editableSectionSchema.extend({
  title: z.string().trim().min(1, "Dê um título à seção.").max(LIMITS.title),
  abbreviation: z.string().trim().max(LIMITS.abbreviation).optional(),
  fields: z
    .array(templateFieldSchema)
    .min(1, "Adicione pelo menos um campo.")
    .max(LIMITS.fieldsPerSection, `No máximo ${LIMITS.fieldsPerSection} campos por seção.`),
});

export const templateSchema = z
  .object({
    sections: z
      .array(templateSectionSchema)
      .min(1, "O modelo precisa de pelo menos uma seção.")
      .max(LIMITS.sections, `No máximo ${LIMITS.sections} seções.`),
  })
  .superRefine((template, ctx) => {
    // ids repetidos quebrariam as respostas das anamneses (chaveadas por id).
    const seen = new Set<string>();
    template.sections.forEach((section, sectionIndex) => {
      const ids = [section.id, ...section.fields.map((field) => field.id)];
      for (const id of ids) {
        if (seen.has(id)) {
          ctx.addIssue({
            code: "custom",
            message: "Identificador repetido.",
            path: ["sections", sectionIndex],
          });
        }
        seen.add(id);
      }
    });
  });

export type EditableTemplate = z.infer<typeof editableTemplateSchema>;
export type EditableSection = EditableTemplate["sections"][number];
export type EditableField = EditableSection["fields"][number];

export type TemplateField = z.infer<typeof templateFieldSchema>;
export type TemplateSection = z.infer<typeof templateSectionSchema>;
export type Template = z.infer<typeof templateSchema>;

/** Rascunho de modelo novo (vindo da IA ou criado do zero), ainda não salvo. */
export const templateDraftSchema = z.object({
  title: z.string().max(LIMITS.templateTitle),
  schema: editableTemplateSchema,
  /** Pasta do arquivo original no bucket (`{user_id}/sources/{uploadId}`). */
  sourceFilePath: z.string().max(200).optional(),
  origin: z.enum(["ai", "manual"]),
  /** Especialidade e "modelo padrão" escolhidos no editor antes de salvar. */
  specialtyId: z.string().max(64).nullable().optional(),
  isDefault: z.boolean().optional(),
});

export type TemplateDraft = z.infer<typeof templateDraftSchema>;

export function newId(): string {
  return crypto.randomUUID();
}
