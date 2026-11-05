import { Document, Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { Fragment } from "react";
import type { AnamnesisExport } from "@/lib/anamneses/export";

/*
 * Carregado só no navegador, sob demanda (ver `download-pdf.ts`). A fonte é a
 * Inter (sem serifa, subconjunto latino, cobre o português) servida de
 * `public/fonts/`.
 */

let fontsRegistered = false;

function registerFonts(origin: string) {
  if (fontsRegistered) return;
  const base = `${origin}/fonts`;
  Font.register({
    family: "Inter",
    fonts: [
      { src: `${base}/inter-latin-400-normal.woff`, fontWeight: 400 },
      { src: `${base}/inter-latin-600-normal.woff`, fontWeight: 600 },
      { src: `${base}/inter-latin-700-normal.woff`, fontWeight: 700 },
    ],
  });
  // A hifenização padrão é do inglês; em português quebraria palavras errado.
  Font.registerHyphenationCallback((word) => [word]);
  fontsRegistered = true;
}

/** Símbolos fora do subconjunto latino da fonte, trocados por equivalentes. */
const REPLACEMENTS: Record<string, string> = {
  "≥": ">=",
  "≤": "<=",
  "≠": "!=",
  "→": "->",
  "←": "<-",
  "↑": "^",
  "↓": "v",
  "≈": "~",
  "✓": "OK",
  " ": " ",
};
const REPLACEMENT_PATTERN = new RegExp(`[${Object.keys(REPLACEMENTS).join("")}]`, "g");

function safe(value: string): string {
  return value.replace(REPLACEMENT_PATTERN, (char) => REPLACEMENTS[char] ?? char);
}

const ACCENT = "#7c1b2a";
const TEXT = "#1c1917";
const MUTED = "#6b625a";
const RULE = "#e7ded3";

const BODY = { fontSize: 10, lineHeight: 1.45 } as const;

const styles = StyleSheet.create({
  page: {
    fontFamily: "Inter",
    fontSize: 10,
    color: TEXT,
    paddingTop: 40,
    paddingBottom: 52,
    paddingHorizontal: 44,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 16,
    paddingBottom: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: ACCENT,
    marginBottom: 9,
  },
  headerMain: { flexGrow: 1, flexShrink: 1 },
  title: { fontSize: 15, fontWeight: 700, lineHeight: 1.25, letterSpacing: 0.2 },
  meta: { marginTop: 4, fontSize: 9, color: MUTED },
  metaStrong: { fontWeight: 600, color: TEXT },
  headerSide: { maxWidth: 200, alignItems: "flex-end" },
  sideLine: { fontSize: 8.5, color: MUTED, textAlign: "right" },
  // lineHeight vai em cada texto, junto com o fontSize: herdado da página, ele
  // some com o texto dinâmico (número da página) no react-pdf 4.9, e sem o
  // fontSize no mesmo estilo é calculado sobre o tamanho padrão (18).
  inlineSection: { marginTop: 7, ...BODY },
  headingInline: { fontWeight: 700 },
  heading: { marginTop: 7, fontWeight: 700, ...BODY },
  item: { paddingLeft: 8, ...BODY },
  label: { fontWeight: 600 },
  footerRule: {
    position: "absolute",
    bottom: 38,
    left: 44,
    right: 44,
    borderTopWidth: 0.5,
    borderTopColor: RULE,
  },
  footerLeft: {
    position: "absolute",
    bottom: 24,
    left: 44,
    right: 120,
    fontSize: 8,
    color: MUTED,
  },
  footerRight: {
    position: "absolute",
    bottom: 24,
    left: 44,
    right: 44,
    fontSize: 8,
    color: MUTED,
    textAlign: "right",
  },
});

/** Espaço mínimo (pt) depois de um título; menos que isso, ele vai para a próxima página. */
const MIN_AHEAD = 30;

/** Elemento `<Document>` pronto para o `pdf()` (sem hooks; chamado como função). */
export function anamnesisPdfDocument(
  document: AnamnesisExport,
  origin: string = window.location.origin,
) {
  registerFonts(origin);
  const { header, sections } = document;
  const footerLeft = [header.title, header.patientLabel].filter(Boolean).join(" · ");

  return (
    <Document
      title={safe(footerLeft || header.title)}
      author={safe(header.author) || undefined}
      creator="Anamnese Padronizada"
      producer="Anamnese Padronizada"
      language="pt-BR"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <View style={styles.headerMain}>
            <Text style={styles.title}>{safe(header.title)}</Text>
            <Text style={styles.meta}>
              {header.patientLabel ? (
                <>
                  PACIENTE: <Text style={styles.metaStrong}>{safe(header.patientLabel)}</Text>
                  {"   ·   "}
                </>
              ) : null}
              DATA: <Text style={styles.metaStrong}>{header.date}</Text>
            </Text>
          </View>
          {header.author || header.institution ? (
            <View style={styles.headerSide}>
              {header.author ? <Text style={styles.sideLine}>{safe(header.author)}</Text> : null}
              {header.institution ? (
                <Text style={styles.sideLine}>{safe(header.institution)}</Text>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* Títulos e campos como irmãos diretos da página (sem View por seção):
            assim o minPresenceAhead consegue levar um título que cairia sozinho
            no fim da página para a próxima. */}
        {sections.map((section) =>
          section.inline ? (
            <Text key={section.id} style={styles.inlineSection}>
              <Text style={styles.headingInline}>{safe(section.heading)}</Text>
              {section.text ? ` ${safe(section.text)}` : ""}
            </Text>
          ) : (
            <Fragment key={section.id}>
              <Text style={styles.heading} minPresenceAhead={MIN_AHEAD}>
                {safe(section.heading)}
              </Text>
              {section.items.map((item, index) => (
                <Text key={index} style={styles.item}>
                  <Text style={styles.label}>-{safe(item.label)}:</Text> {safe(item.value)}
                </Text>
              ))}
            </Fragment>
          ),
        )}

        <View style={styles.footerRule} fixed />
        <Text style={styles.footerLeft} fixed>
          {safe(footerLeft)}
        </Text>
        <Text
          style={styles.footerRight}
          fixed
          render={({ pageNumber, totalPages }) => `${pageNumber}/${totalPages}`}
        />
      </Page>
    </Document>
  );
}
