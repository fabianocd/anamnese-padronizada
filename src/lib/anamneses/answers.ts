import { z } from "zod";
import { toUpper } from "@/lib/upper-case";
import type { EditableTemplate, FieldType } from "@/lib/templates/schema";

/**
 * Respostas de uma anamnese (`anamneses.answers`), chaveadas pelo id do campo
 * no snapshot do modelo. Texto, número, data (AAAA-MM-DD) e opção são strings;
 * Sim/Não guarda a escolha e uma observação opcional (decisão 6).
 */
export type YesNoAnswer = { choice: "yes" | "no" | null; note: string };
export type AnswerValue = string | YesNoAnswer;
export type Answers = Record<string, AnswerValue>;

export const ANSWER_LIMITS = {
  shortText: 500,
  longText: 10000,
  number: 40,
  note: 1000,
  title: 160,
  patientLabel: 40,
} as const;

const yesNoSchema = z.object({
  choice: z.enum(["yes", "no"]).nullable(),
  note: z.string().max(ANSWER_LIMITS.note),
});

export const answersSchema = z.record(
  z.string().max(80),
  z.union([z.string().max(ANSWER_LIMITS.longText), yesNoSchema]),
);

/** Título e identificação curta, editáveis no topo do formulário. */
export const anamnesisMetaSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Dê um título à anamnese.")
    .max(ANSWER_LIMITS.title, `Título muito longo (máx. ${ANSWER_LIMITS.title} caracteres).`)
    .transform(toUpper),
  patientLabel: z
    .string()
    .trim()
    .max(
      ANSWER_LIMITS.patientLabel,
      `Use só iniciais ou um código (máx. ${ANSWER_LIMITS.patientLabel} caracteres).`,
    )
    .transform(toUpper),
});

export const saveAnamnesisInputSchema = anamnesisMetaSchema.extend({
  id: z.uuid(),
  answers: answersSchema,
});

export type SaveAnamnesisInput = z.infer<typeof saveAnamnesisInputSchema>;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function maxLength(type: FieldType): number {
  if (type === "long_text") return ANSWER_LIMITS.longText;
  if (type === "number") return ANSWER_LIMITS.number;
  return ANSWER_LIMITS.shortText;
}

/**
 * Mantém só respostas de campos que existem no snapshot e no formato do tipo
 * do campo; o resto é descartado. Respostas vazias também saem.
 */
export function sanitizeAnswers(snapshot: EditableTemplate, raw: Answers): Answers {
  const clean: Answers = {};

  for (const section of snapshot.sections) {
    for (const field of section.fields) {
      const value = raw[field.id];
      if (value === undefined) continue;

      if (field.type === "yes_no") {
        if (typeof value !== "object") continue;
        const note = value.note.slice(0, ANSWER_LIMITS.note);
        if (value.choice || note.trim()) clean[field.id] = { choice: value.choice, note };
        continue;
      }

      if (typeof value !== "string") continue;
      const text = value.slice(0, maxLength(field.type));
      if (!text.trim()) continue;
      if (field.type === "date" && !DATE_PATTERN.test(text)) continue;
      if (field.type === "select" && !(field.options ?? []).includes(text)) continue;
      clean[field.id] = text;
    }
  }

  return clean;
}

export function isAnswered(value: AnswerValue | undefined): boolean {
  if (value === undefined) return false;
  if (typeof value === "string") return value.trim() !== "";
  return value.choice !== null || value.note.trim() !== "";
}

/** Quantos campos do snapshot têm resposta. */
export function countAnswered(
  snapshot: EditableTemplate,
  answers: Answers,
): { answered: number; total: number } {
  let answered = 0;
  let total = 0;
  for (const section of snapshot.sections) {
    for (const field of section.fields) {
      total += 1;
      if (isAnswered(answers[field.id])) answered += 1;
    }
  }
  return { answered, total };
}
