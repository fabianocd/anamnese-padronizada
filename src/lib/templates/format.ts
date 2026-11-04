/**
 * Regras de formatação da anamnese (ver CLAUDE.md), compartilhadas pela
 * prévia do editor e, na fase 6, pelo PDF e pelo "copiar texto".
 */

type SectionLike = {
  title: string;
  abbreviation?: string;
  singleLine?: boolean;
  fields: unknown[];
};

/** `#SIGLA:` quando houver sigla; senão `#TÍTULO POR EXTENSO:`. */
export function sectionHeading(section: Pick<SectionLike, "title" | "abbreviation">): string {
  const name = (section.abbreviation || section.title).trim().toLocaleUpperCase("pt-BR");
  return `#${name || "SEM TÍTULO"}:`;
}

/**
 * Respostas na mesma linha do título: seção marcada como "linha única"
 * (padrão na #ID) ou com um campo só (decisão 1 do PLANO).
 */
export function isInlineSection(section: Pick<SectionLike, "singleLine" | "fields">): boolean {
  return Boolean(section.singleLine) || section.fields.length === 1;
}
