"use client";

import { exportFileName, type AnamnesisExport } from "@/lib/anamneses/export";

/**
 * Gera o PDF no navegador e baixa. O `@react-pdf/renderer` (pesado) só é
 * carregado no primeiro uso.
 */
export async function downloadAnamnesisPdf(document: AnamnesisExport): Promise<void> {
  const [{ pdf }, { anamnesisPdfDocument }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("./anamnesis-pdf"),
  ]);
  const blob = await pdf(anamnesisPdfDocument(document)).toBlob();
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = exportFileName(document.header);
  window.document.body.appendChild(link);
  link.click();
  link.remove();
  // Dá tempo ao navegador de começar o download antes de liberar o blob.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Pré-carrega o gerador de PDF (ex.: ao abrir a prévia). */
export function preloadPdf(): void {
  void import("@react-pdf/renderer");
  void import("./anamnesis-pdf");
}
