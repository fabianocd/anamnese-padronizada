import { z } from "zod";
import {
  FIELD_TYPES,
  KNOWN_ABBREVIATIONS,
  LIMITS,
  newId,
  type EditableField,
  type EditableSection,
  type EditableTemplate,
  type Template,
  type TemplateField,
  type TemplateSection,
} from "./schema";

/**
 * Formato pedido à IA (sem ids; "" e [] significam "não tem"). Também é a
 * base do JSON schema enviado ao Gemini. A validação é tolerante: o que vier
 * fora do esperado é corrigido na normalização.
 */
export const aiExtractionSchema = z.object({
  isAnamnesisForm: z
    .boolean()
    .describe("false se o documento não for uma ficha de anamnese/roteiro clínico"),
  suggestedTitle: z
    .string()
    .describe('Título curto do modelo, ex.: "Anamnese Pediátrica"'),
  sections: z.array(
    z.object({
      title: z.string().describe("Título da seção por extenso, sem numeração"),
      abbreviation: z
        .string()
        .describe(`Sigla consagrada (${KNOWN_ABBREVIATIONS.join(", ")}) ou "" se não houver`),
      fields: z.array(
        z.object({
          label: z.string().describe("Rótulo do campo, sem ':' no fim"),
          type: z.enum(FIELD_TYPES),
          options: z.array(z.string()).describe('Opções, só para "select"; senão []'),
          hint: z
            .string()
            .describe('Orientação para quem preenche (perguntas, faixas, escala) ou ""'),
        }),
      ),
    }),
  ),
});

export type AiExtraction = z.infer<typeof aiExtractionSchema>;

/** Títulos por extenso que têm sigla consagrada (chave sem acento, maiúscula). */
const TITLE_ABBREVIATIONS: Record<string, (typeof KNOWN_ABBREVIATIONS)[number]> = {
  IDENTIFICACAO: "ID",
  "QUEIXA PRINCIPAL": "QP",
  "HISTORIA DA DOENCA ATUAL": "HDA",
  "HISTORIA DA MOLESTIA ATUAL": "HDA",
  "HISTORIA PATOLOGICA PREGRESSA": "HPP",
  "HISTORIA FAMILIAR": "HF",
  "HISTORIA FAMILIAL": "HF",
  "ANTECEDENTES FAMILIARES": "HF",
  "HIPOTESE DIAGNOSTICA": "HD",
  "HIPOTESES DIAGNOSTICAS": "HD",
  "HIPOTESES DIAGNOSTICA": "HD",
  "DESENVOLVIMENTO NEUROPSICOMOTOR": "DNPM",
};

const CONDUTA = "CONDUTA";

function upper(value: string): string {
  return value.toLocaleUpperCase("pt-BR");
}

/** Maiúsculo, sem acentos e espaços extras: para comparar títulos. */
function comparable(value: string): string {
  return upper(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function clip(value: string, max: number): string {
  return value.length > max ? value.slice(0, max).trim() : value;
}

/** Tira numeração ("1.", "12)"), "#" e ":" das pontas e espaços repetidos. */
function cleanHeading(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^#+\s*/, "")
    .replace(/^\(?\d{1,3}\s*[.)\-–]\s*/, "")
    .replace(/[\s:.\-–]+$/, "")
    .trim();
}

function normalizeAbbreviation(raw: string, title: string): string | undefined {
  const candidate = comparable(raw.replace(/[#:.\s]/g, ""));
  if ((KNOWN_ABBREVIATIONS as readonly string[]).includes(candidate)) return candidate;
  return TITLE_ABBREVIATIONS[comparable(title)];
}

function normalizeField(raw: AiExtraction["sections"][number]["fields"][number]): TemplateField | null {
  const label = clip(upper(cleanHeading(raw.label)), LIMITS.label);
  if (!label) return null;

  const options = [
    ...new Set(raw.options.map((option) => clip(upper(option.replace(/\s+/g, " ").trim()), LIMITS.option))),
  ]
    .filter(Boolean)
    .slice(0, LIMITS.options);

  // "select" sem opções não tem como ser preenchido: vira texto curto.
  const type = raw.type === "select" && options.length === 0 ? "short_text" : raw.type;
  const hint = clip(upper(raw.hint.replace(/\s+/g, " ").trim()), LIMITS.hint);

  return {
    id: newId(),
    label,
    type,
    ...(type === "select" ? { options } : {}),
    ...(hint ? { hint } : {}),
  };
}

export function isCondutaSection(section: { title: string }): boolean {
  return comparable(cleanHeading(section.title)) === CONDUTA;
}

/**
 * A `#CONDUTA` é texto corrido: campo de texto curto nela vira texto longo.
 * Vale para modelos (ao salvar) e para snapshots antigos de anamneses (ao ler).
 */
export function withLongConduta<T extends { sections: EditableSection[] }>(template: T): T {
  return {
    ...template,
    sections: template.sections.map((section) =>
      isCondutaSection(section) && section.fields.some((field) => field.type === "short_text")
        ? {
            ...section,
            fields: section.fields.map((field) =>
              field.type === "short_text" ? { ...field, type: "long_text" as const } : field,
            ),
          }
        : section,
    ),
  };
}

function condutaSection(fields: TemplateField[] = []): TemplateSection {
  return {
    id: newId(),
    title: CONDUTA,
    fields: fields.length > 0 ? fields : [{ id: newId(), label: CONDUTA, type: "long_text" }],
  };
}

/**
 * Garante as regras do modelo: ids novos, títulos e rótulos em caixa alta,
 * siglas só da lista consagrada, `#ID` em linha única, seções vazias com um
 * campo de texto e uma única `#CONDUTA:` no fim.
 */
export function normalizeTemplate(raw: AiExtraction): Template {
  const sections: TemplateSection[] = [];
  const condutaFields: TemplateField[] = [];

  for (const rawSection of raw.sections) {
    const title = clip(upper(cleanHeading(rawSection.title)), LIMITS.title);
    if (!title) continue;

    const fields = rawSection.fields
      .map(normalizeField)
      .filter((field): field is TemplateField => field !== null)
      .slice(0, LIMITS.fieldsPerSection);

    if (comparable(title) === CONDUTA) {
      condutaFields.push(...fields);
      continue;
    }

    const abbreviation = normalizeAbbreviation(rawSection.abbreviation, title);
    sections.push({
      id: newId(),
      title,
      ...(abbreviation ? { abbreviation } : {}),
      ...(abbreviation === "ID" ? { singleLine: true } : {}),
      // Seção sem subcampos (ex.: "Queixa principal:") vira um campo de texto.
      fields: fields.length > 0 ? fields : [{ id: newId(), label: title, type: "long_text" }],
    });
  }

  const limited = sections.slice(0, LIMITS.sections - 1);
  limited.push(condutaSection(condutaFields.slice(0, LIMITS.fieldsPerSection)));
  return withLongConduta({ sections: limited });
}

export function normalizeTitle(raw: string, fallback = "NOVO MODELO"): string {
  const title = clip(upper(raw.replace(/\s+/g, " ").trim()), LIMITS.templateTitle);
  return title || fallback;
}

/** Ponto de partida para criar um modelo sem a IA. */
export function createBlankTemplate(): Template {
  const field = (label: string, type: TemplateField["type"], hint?: string): TemplateField => ({
    id: newId(),
    label,
    type,
    ...(hint ? { hint } : {}),
  });

  return {
    sections: [
      {
        id: newId(),
        title: "IDENTIFICAÇÃO",
        abbreviation: "ID",
        singleLine: true,
        fields: [
          field("INICIAIS", "short_text", "Use iniciais ou um código, nunca o nome completo."),
          field("IDADE", "short_text"),
        ],
      },
      {
        id: newId(),
        title: "QUEIXA PRINCIPAL",
        abbreviation: "QP",
        fields: [field("QUEIXA PRINCIPAL", "long_text")],
      },
      {
        id: newId(),
        title: "HISTÓRIA DA DOENÇA ATUAL",
        abbreviation: "HDA",
        fields: [field("HISTÓRIA DA DOENÇA ATUAL", "long_text")],
      },
      condutaSection(),
    ],
  };
}

function collapse(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function prepareField(field: EditableField): EditableField {
  const hint = upper(collapse(field.hint ?? ""));
  const options =
    field.type === "select"
      ? [...new Set((field.options ?? []).map((option) => upper(collapse(option))).filter(Boolean))]
      : undefined;
  return {
    id: field.id,
    label: upper(cleanHeading(field.label)),
    type: field.type,
    ...(options ? { options } : {}),
    ...(hint ? { hint } : {}),
  };
}

function prepareSection(section: EditableSection): EditableSection {
  const abbreviation = upper(section.abbreviation ?? "").replace(/[#:\s]/g, "");
  return {
    id: section.id,
    title: upper(cleanHeading(section.title)),
    ...(abbreviation ? { abbreviation } : {}),
    ...(section.singleLine ? { singleLine: true } : {}),
    // Seção sem subcampos vira um campo de texto livre. O id é derivado do da
    // seção para dar o mesmo resultado no editor e no servidor.
    fields:
      section.fields.length > 0
        ? section.fields.map(prepareField)
        : [{ id: `${section.id}-texto`, label: upper(cleanHeading(section.title)), type: "long_text" }],
  };
}

/**
 * Arruma o modelo editado antes de validar e salvar: espaços, caixa alta em
 * títulos/siglas/rótulos/dicas/opções, opções só em "select" (sem vazias nem repetidas) e
 * uma única `#CONDUTA:` no fim. Não inventa conteúdo: o que continuar
 * inválido (ex.: rótulo vazio) é apontado pela validação estrita.
 */
export function prepareTemplateForSave(template: EditableTemplate): EditableTemplate {
  const sections = template.sections.map(prepareSection);
  const regular = sections.filter((section) => !isCondutaSection(section));
  const conduta = sections.filter(isCondutaSection);

  const condutaFields = conduta.flatMap((section) => section.fields);
  const last: EditableSection = conduta[0]
    ? { ...conduta[0], title: CONDUTA, fields: condutaFields }
    : condutaSection();

  return withLongConduta({ sections: [...regular, last] });
}
