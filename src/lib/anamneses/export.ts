import { isAnswered, type Answers, type AnswerValue } from "@/lib/anamneses/answers";
import { isInlineSection, sectionHeading } from "@/lib/templates/format";
import { isCondutaSection } from "@/lib/templates/normalize";
import type { EditableField, EditableTemplate } from "@/lib/templates/schema";

/**
 * Formatador único da anamnese preenchida (ver "Padrão de formatação" no
 * CLAUDE.md). A prévia, o "copiar texto" e o PDF partem do mesmo resultado:
 * - tudo em caixa alta;
 * - `#SIGLA:` ou `#TÍTULO:` em cada seção;
 * - `-RÓTULO: RESPOSTA` em cada campo, ou tudo na linha do título em seções
 *   de linha única / com um campo só;
 * - campos sem resposta (e seções sem nenhuma) são omitidos, menos a
 *   `#CONDUTA:`, que sempre aparece;
 * - dicas nunca entram (decisão 4).
 */

export type ExportItem = { label: string; value: string };

export type ExportSection = {
  id: string;
  heading: string;
  /** Seção de linha única: respostas na linha do título. */
  inline: boolean;
  /** Texto na linha do título (seções em linha); vazio na `#CONDUTA:` sem resposta. */
  text: string;
  /** Campos com resposta (seções que não são em linha). */
  items: ExportItem[];
};

export type ExportHeader = {
  title: string;
  patientLabel: string;
  /** Data da anamnese, já formatada (DD/MM/AAAA). */
  date: string;
  author: string;
  institution: string;
};

export type AnamnesisExport = {
  header: ExportHeader;
  sections: ExportSection[];
};

export type ExportInput = {
  title: string;
  patientLabel: string;
  createdAt: string;
  snapshot: EditableTemplate;
  answers: Answers;
  author?: { fullName: string | null; institution: string | null };
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

export function upper(value: string): string {
  return value.toLocaleUpperCase("pt-BR");
}

/** Espaços nas pontas fora; quebras de linha internas mantidas (sem linhas em branco extras). */
function clean(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function formatDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

/** Resposta de um campo no formato de exportação (sem caixa alta ainda). */
function formatValue(field: EditableField, value: AnswerValue | undefined): string {
  if (!isAnswered(value) || value === undefined) return "";

  if (typeof value === "object") {
    // Sim/Não com observação opcional (decisão 6): "SIM, 8 CONSULTAS".
    const choice = value.choice === "yes" ? "Sim" : value.choice === "no" ? "Não" : "";
    const note = clean(value.note);
    return [choice, note].filter(Boolean).join(", ");
  }

  if (field.type === "date") return formatDate(value.trim());
  return clean(value);
}

export function buildAnamnesisExport(input: ExportInput): AnamnesisExport {
  const sections: ExportSection[] = [];

  for (const section of input.snapshot.sections) {
    const heading = sectionHeading(section);
    const inline = isInlineSection(section);
    const answered = section.fields
      .map((field) => ({ field, value: formatValue(field, input.answers[field.id]) }))
      .filter((entry) => entry.value !== "");

    if (answered.length === 0) {
      if (isCondutaSection(section)) {
        sections.push({ id: section.id, heading, inline: true, text: "", items: [] });
      }
      continue;
    }

    if (inline) {
      // Em linha com vários campos, Sim/Não leva o rótulo ("TABAGISMO: NÃO"),
      // senão a resposta solta não diria a que se refere.
      const several = section.fields.length > 1;
      const text = answered
        .map(({ field, value }) =>
          several && field.type === "yes_no" ? `${field.label.trim()}: ${value}` : value,
        )
        .join(", ");
      sections.push({ id: section.id, heading, inline: true, text: upper(text), items: [] });
      continue;
    }

    sections.push({
      id: section.id,
      heading,
      inline: false,
      text: "",
      items: answered.map(({ field, value }) => ({
        label: upper(field.label.trim()) || "CAMPO",
        value: upper(value),
      })),
    });
  }

  return {
    header: {
      title: upper(input.title.trim()) || "ANAMNESE",
      patientLabel: upper(input.patientLabel.trim()),
      date: dateFormatter.format(new Date(input.createdAt)),
      author: input.author?.fullName?.trim() ?? "",
      institution: input.author?.institution?.trim() ?? "",
    },
    sections,
  };
}

/** Texto puro para colar no prontuário (só o corpo, sem cabeçalho). */
export function anamnesisToText(document: AnamnesisExport): string {
  return document.sections
    .map((section) => {
      if (section.inline) return section.text ? `${section.heading} ${section.text}` : section.heading;
      return [section.heading, ...section.items.map((item) => `-${item.label}: ${item.value}`)].join(
        "\n",
      );
    })
    .join("\n");
}

/** Nome do arquivo: `anamnese-pediatrica-ms-04-11-2026.pdf`. */
export function exportFileName(header: ExportHeader): string {
  const slug = [header.title, header.patientLabel, header.date.replace(/\//g, "-")]
    .filter(Boolean)
    .join("-")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${slug || "anamnese"}.pdf`;
}
