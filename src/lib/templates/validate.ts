import { z } from "zod";
import { prepareTemplateForSave } from "./normalize";
import {
  editableTemplateSchema,
  LIMITS,
  templateSchema,
  type EditableTemplate,
  type Template,
} from "./schema";

/** O que o editor envia para salvar (Server Action `saveTemplate`). */
export const saveTemplateInputSchema = z.object({
  id: z.uuid().optional(),
  title: z
    .string()
    .trim()
    .min(1, "Dê um título ao modelo.")
    .max(LIMITS.templateTitle, `Título muito longo (máx. ${LIMITS.templateTitle} caracteres).`),
  specialtyId: z.uuid().nullable(),
  isDefault: z.boolean(),
  schema: editableTemplateSchema,
  /** Só na criação: pasta do envio original (`{user_id}/sources/{uploadId}`). */
  sourceFilePath: z.string().max(200).optional(),
});

export type SaveTemplateInput = z.infer<typeof saveTemplateInputSchema>;

/** Erros de validação apontados por id de seção/campo, para o editor destacar. */
export type EditorIssues = {
  title?: string;
  general?: string;
  sections: Record<string, { title?: string; fields?: string; other?: string }>;
  fields: Record<string, { label?: string; options?: string; hint?: string }>;
};

export function emptyIssues(): EditorIssues {
  return { sections: {}, fields: {} };
}

export function hasIssues(issues: EditorIssues): boolean {
  return Boolean(
    issues.title ||
      issues.general ||
      Object.keys(issues.sections).length ||
      Object.keys(issues.fields).length,
  );
}

function mapSchemaIssues(template: EditableTemplate, error: z.ZodError): EditorIssues {
  const issues = emptyIssues();

  for (const issue of error.issues) {
    const [root, sectionIndex, key, fieldIndex, fieldKey] = issue.path;
    if (root !== "sections" || typeof sectionIndex !== "number") {
      issues.general ??= issue.message;
      continue;
    }
    const section = template.sections[sectionIndex];
    if (!section) continue;

    if (key === "fields" && typeof fieldIndex === "number") {
      const field = section.fields[fieldIndex];
      if (!field) continue;
      const target = (issues.fields[field.id] ??= {});
      if (fieldKey === "label") target.label ??= issue.message;
      else if (fieldKey === "options") target.options ??= issue.message;
      else if (fieldKey === "hint") target.hint ??= "Dica muito longa.";
      else target.label ??= issue.message;
      continue;
    }

    const target = (issues.sections[section.id] ??= {});
    if (key === "title") target.title ??= issue.message;
    else if (key === "fields") target.fields ??= issue.message;
    else target.other ??= issue.message;
  }

  return issues;
}

export type TemplateValidation =
  | { ok: true; title: string; schema: Template }
  | { ok: false; issues: EditorIssues; prepared: EditableTemplate };

/**
 * Normaliza e valida o modelo para salvar. Roda no editor (para destacar os
 * erros antes de enviar) e de novo no servidor, que é quem decide.
 */
export function validateTemplateForSave(title: string, schema: EditableTemplate): TemplateValidation {
  const prepared = prepareTemplateForSave(schema);
  const issues = emptyIssues();

  const titleResult = saveTemplateInputSchema.shape.title.safeParse(title);
  if (!titleResult.success) issues.title = titleResult.error.issues[0]?.message;

  const parsed = templateSchema.safeParse(prepared);
  if (!parsed.success) {
    const mapped = mapSchemaIssues(prepared, parsed.error);
    return { ok: false, prepared, issues: { ...mapped, title: issues.title } };
  }
  if (!titleResult.success) return { ok: false, prepared, issues };

  return { ok: true, title: titleResult.data, schema: parsed.data };
}
