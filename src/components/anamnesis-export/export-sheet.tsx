"use client";

import { ClipboardCopy, FileDown, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { AnamnesisExport } from "@/lib/anamneses/export";
import { AnamnesisPreview } from "./anamnesis-preview";
import { useAnamnesisExport } from "./use-anamnesis-export";

/** Painel lateral com a prévia da exportação, "Copiar texto" e "Baixar PDF". */
export function ExportSheet({
  open,
  onOpenChange,
  document,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: AnamnesisExport;
}) {
  const { download, copy, downloading, copying } = useAnamnesisExport();
  const empty = document.sections.every((section) => !section.text && section.items.length === 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="glass-strong gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-2xl"
      >
        <SheetHeader className="pr-12">
          <SheetTitle>Prévia da exportação</SheetTitle>
          <SheetDescription>
            Como fica no PDF e no texto copiado: caixa alta, campos vazios omitidos e #CONDUTA
            sempre no fim.
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">
          {empty ? (
            <p className="mb-3 rounded-xl border border-border bg-background/40 px-3 py-2 text-sm text-muted-foreground">
              Nenhum campo preenchido ainda: só a #CONDUTA aparece.
            </p>
          ) : null}
          <AnamnesisPreview document={document} />
        </div>
        <SheetFooter className="flex-row justify-end gap-2 border-t border-border">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-10 rounded-xl px-4"
            onClick={() => void copy(document)}
            disabled={copying}
          >
            {copying ? <LoaderCircle className="animate-spin" aria-hidden /> : <ClipboardCopy aria-hidden />}
            Copiar texto
          </Button>
          <Button
            type="button"
            size="lg"
            className="h-10 rounded-xl px-4"
            onClick={() => void download(document)}
            disabled={downloading}
            aria-busy={downloading || undefined}
          >
            {downloading ? <LoaderCircle className="animate-spin" aria-hidden /> : <FileDown aria-hidden />}
            Baixar PDF
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
