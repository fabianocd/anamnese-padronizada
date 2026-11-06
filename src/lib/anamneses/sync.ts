import { isAnswered, sanitizeAnswers, type Answers, type AnswerValue } from "@/lib/anamneses/answers";
import { isCondutaSection } from "@/lib/templates/normalize";
import type { EditableField, EditableSection, EditableTemplate } from "@/lib/templates/schema";

/**
 * Atualizar uma anamnese com a versão atual do modelo (decisão 36).
 *
 * A estrutura passa a ser a do modelo (campos novos, rótulos, ordem, tipos),
 * casando os campos pelo id, e nenhuma resposta se perde:
 * - campo que saiu do modelo mas tem resposta continua na anamnese (na mesma
 *   seção, se ela existir; senão a seção antiga fica, antes da #CONDUTA);
 * - campo que mudou de tipo/opções de um jeito que invalida a resposta
 *   (ex.: texto → Sim/Não, opção que saiu da lista) mantém a versão antiga.
 */

export type TemplateUpdate = {
  /** Campos que entram na anamnese. */
  added: number;
  /** Campos (sem resposta) que saem da anamnese. */
  removed: number;
};

function fits(field: EditableField, value: AnswerValue): boolean {
  const clean = sanitizeAnswers(
    { sections: [{ id: "_", title: "_", fields: [field] }] },
    { [field.id]: value },
  );
  return JSON.stringify(clean[field.id]) === JSON.stringify(value);
}

export function mergeTemplateIntoSnapshot(
  snapshot: EditableTemplate,
  template: EditableTemplate,
  answers: Answers,
): EditableTemplate {
  const previous = new Map<string, EditableField>();
  for (const section of snapshot.sections) {
    for (const field of section.fields) previous.set(field.id, field);
  }
  const templateFieldIds = new Set(
    template.sections.flatMap((section) => section.fields.map((field) => field.id)),
  );

  const sections: EditableSection[] = template.sections.map((section) => ({
    ...section,
    fields: section.fields.map((field) => {
      const old = previous.get(field.id);
      const value = answers[field.id];
      return old && value !== undefined && isAnswered(value) && !fits(field, value) ? old : field;
    }),
  }));

  for (const oldSection of snapshot.sections) {
    const kept = oldSection.fields.filter(
      (field) => !templateFieldIds.has(field.id) && isAnswered(answers[field.id]),
    );
    if (kept.length === 0) continue;

    const target =
      sections.find((section) => section.id === oldSection.id) ??
      (isCondutaSection(oldSection) ? sections.find(isCondutaSection) : undefined);
    if (target) {
      target.fields = [...target.fields, ...kept];
      continue;
    }
    const condutaIndex = sections.findIndex(isCondutaSection);
    const at = condutaIndex === -1 ? sections.length : condutaIndex;
    sections.splice(at, 0, { ...oldSection, fields: kept });
  }

  return { sections };
}

/** Forma comparável (sem diferença de ordem de chaves nem de opcionais vazios). */
function canonical(template: EditableTemplate): string {
  return JSON.stringify(
    template.sections.map((section) => [
      section.id,
      section.title,
      section.abbreviation ?? "",
      Boolean(section.singleLine),
      section.fields.map((field) => [
        field.id,
        field.label,
        field.type,
        field.options ?? [],
        field.hint ?? "",
      ]),
    ]),
  );
}

function fieldIds(template: EditableTemplate): Set<string> {
  return new Set(template.sections.flatMap((section) => section.fields.map((field) => field.id)));
}

/**
 * O que mudaria ao atualizar a anamnese; null se já está igual ao modelo.
 * Campos removidos com resposta não contam (eles ficam).
 */
export function describeTemplateUpdate(
  snapshot: EditableTemplate,
  template: EditableTemplate,
  answers: Answers,
): { update: TemplateUpdate; merged: EditableTemplate } | null {
  const merged = mergeTemplateIntoSnapshot(snapshot, template, answers);
  if (canonical(merged) === canonical(snapshot)) return null;

  const before = fieldIds(snapshot);
  const after = fieldIds(merged);
  return {
    merged,
    update: {
      added: [...after].filter((id) => !before.has(id)).length,
      removed: [...before].filter((id) => !after.has(id)).length,
    },
  };
}
