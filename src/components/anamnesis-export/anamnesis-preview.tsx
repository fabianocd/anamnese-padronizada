import type { AnamnesisExport } from "@/lib/anamneses/export";

/**
 * Prévia da exportação em "papel": mesmo conteúdo e hierarquia do PDF
 * (cabeçalho com título, paciente e data; seções no padrão #SEÇÃO:).
 * Fica clara nos dois temas, como a folha impressa.
 */
export function AnamnesisPreview({ document }: { document: AnamnesisExport }) {
  const { header, sections } = document;

  return (
    <article className="rounded-xl bg-[#fffdf9] px-5 py-6 font-sans text-[0.8125rem] leading-relaxed text-stone-900 shadow-sm ring-1 ring-black/5 break-words sm:px-8 sm:py-8">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-b-2 border-[#7c1b2a] pb-2.5">
        <div className="min-w-0">
          <h3 className="text-base font-bold tracking-tight">{header.title}</h3>
          <p className="mt-0.5 text-xs text-stone-500">
            {header.patientLabel ? (
              <>
                PACIENTE: <span className="font-semibold text-stone-900">{header.patientLabel}</span>
                <span className="px-2">·</span>
              </>
            ) : null}
            DATA: <span className="font-semibold text-stone-900">{header.date}</span>
          </p>
        </div>
        {header.author || header.institution ? (
          <div className="text-right text-[0.7rem] leading-snug text-stone-500">
            {header.author ? <p>{header.author}</p> : null}
            {header.institution ? <p>{header.institution}</p> : null}
          </div>
        ) : null}
      </header>

      <div className="flex flex-col gap-1.5">
        {sections.map((section) =>
          section.inline ? (
            <p key={section.id} className="whitespace-pre-line">
              <span className="font-bold">{section.heading}</span>
              {section.text ? ` ${section.text}` : null}
            </p>
          ) : (
            <div key={section.id}>
              <p className="font-bold">{section.heading}</p>
              {section.items.map((item, index) => (
                <p key={index} className="pl-2 whitespace-pre-line">
                  <span className="font-semibold">-{item.label}:</span> {item.value}
                </p>
              ))}
            </div>
          ),
        )}
      </div>
    </article>
  );
}
