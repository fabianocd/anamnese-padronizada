"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { anamnesisToText, type AnamnesisExport } from "@/lib/anamneses/export";
import { downloadAnamnesisPdf } from "./export-actions";

/** O documento pronto, ou uma função que o busca (null = já avisou o erro). */
type Source = AnamnesisExport | (() => Promise<AnamnesisExport | null>);

class Cancelled extends Error {}

async function resolve(source: Source): Promise<AnamnesisExport> {
  const document = typeof source === "function" ? await source() : source;
  if (!document) throw new Cancelled();
  return document;
}

/**
 * Copia o texto. Quando ele ainda vai ser buscado, usa `ClipboardItem` com
 * promessa: o Safari só permite copiar dentro do clique, não depois de um await.
 */
async function writeText(text: Promise<string>): Promise<void> {
  if (typeof ClipboardItem !== "undefined" && typeof navigator.clipboard.write === "function") {
    const blob = text.then((value) => new Blob([value], { type: "text/plain" }));
    await navigator.clipboard.write([new ClipboardItem({ "text/plain": blob })]);
    return;
  }
  await navigator.clipboard.writeText(await text);
}

/** "Baixar PDF" e "Copiar texto" com estado de carregamento e avisos. */
export function useAnamnesisExport() {
  const [downloading, setDownloading] = useState(false);
  const [copying, setCopying] = useState(false);

  const download = useCallback(async (source: Source) => {
    setDownloading(true);
    try {
      await downloadAnamnesisPdf(await resolve(source));
    } catch (error) {
      if (!(error instanceof Cancelled)) {
        toast.error("Não foi possível gerar o PDF. Confira a conexão e tente de novo.");
      }
    } finally {
      setDownloading(false);
    }
  }, []);

  const copy = useCallback(async (source: Source) => {
    setCopying(true);
    const text = resolve(source).then(anamnesisToText);
    try {
      await writeText(text);
      toast.success("Texto copiado. É só colar no prontuário.");
    } catch {
      // Se a busca falhou, o aviso já foi dado (ou vem abaixo).
      const failure = await text.then(
        () => null,
        (error: unknown) => error,
      );
      if (!(failure instanceof Cancelled)) {
        toast.error("Não foi possível copiar. Abra a prévia e selecione o texto.");
      }
    } finally {
      setCopying(false);
    }
  }, []);

  return { download, copy, downloading, copying };
}
