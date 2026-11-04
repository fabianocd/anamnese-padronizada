"use client";

import { memo } from "react";
import { isInlineSection, sectionHeading } from "@/lib/templates/format";
import type { EditableField, EditableSection } from "@/lib/templates/schema";

function upper(value: string): string {
  return value.toLocaleUpperCase("pt-BR");
}

/**
 * O que aparece no lugar da resposta, conforme o tipo do campo. Em seções de
 * uma linha, texto mostra o nome do campo (ex.: `#ID: INICIAIS, IDADE`).
 */
function placeholder(field: EditableField, textAsLabel = false, several = false): string {
  switch (field.type) {
    case "yes_no":
      // Em linha, leva o rótulo, como na exportação ("TABAGISMO: NÃO").
      return several && field.label.trim() ? `${upper(field.label.trim())}: SIM/NÃO` : "SIM/NÃO";
    case "number":
      return "0";
    case "date":
      return "DD/MM/AAAA";
    case "select": {
      const options = (field.options ?? []).filter((option) => option.trim());
      return options.length > 0 ? options.map(upper).join(" / ") : "OPÇÃO";
    }
    default:
      return (textAsLabel && upper(field.label.trim())) || "…";
  }
}

/** Espaço da resposta (tracejado): mostra o que vai ser preenchido ali. */
function Answer({ children }: { children: string }) {
  return (
    <span className="rounded border border-dashed border-primary/50 px-1 text-muted-foreground">
      {children}
    </span>
  );
}

/**
 * Prévia ao vivo no padrão de exportação (#SEÇÃO:, -CAMPO: resposta). As
 * respostas aparecem como espaços tracejados; dicas não entram (decisão 4).
 * Em seções de uma linha, o espaço mostra o nome do campo (que não sai no PDF).
 */
export const TemplatePreview = memo(function TemplatePreview({
  title,
  sections,
}: {
  title: string;
  sections: EditableSection[];
}) {
  return (
    <div className="font-mono text-[0.8rem] leading-relaxed break-words">
      <p className="mb-3 font-sans text-base font-semibold tracking-tight">
        {upper(title.trim()) || "MODELO SEM TÍTULO"}
      </p>
      <div className="flex flex-col gap-2">
        {sections.map((section) => {
          const heading = <span className="font-semibold">{sectionHeading(section)}</span>;

          if (section.fields.length === 0) {
            return (
              <p key={section.id}>
                {heading} <Answer>…</Answer>
              </p>
            );
          }

          if (isInlineSection(section)) {
            return (
              <p key={section.id}>
                {heading}{" "}
                <Answer>
                  {section.fields
                    .map((field) => placeholder(field, true, section.fields.length > 1))
                    .join(", ")}
                </Answer>
              </p>
            );
          }

          return (
            <div key={section.id}>
              <p>{heading}</p>
              {section.fields.map((field) => (
                <p key={field.id}>
                  -{upper(field.label.trim()) || "CAMPO SEM NOME"}:{" "}
                  <Answer>{placeholder(field)}</Answer>
                </p>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
});
