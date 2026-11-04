"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ClipboardCopy,
  Copy,
  EllipsisVertical,
  FileDown,
  FolderOpen,
  LoaderCircle,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  deleteAnamnesis,
  duplicateAnamnesis,
  getAnamnesisExport,
} from "@/app/(app)/anamneses/actions";
import { preloadPdf } from "@/components/anamnesis-export/export-actions";
import { useAnamnesisExport } from "@/components/anamnesis-export/use-anamnesis-export";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AnamnesisActions({ id, title }: { id: string; title: string }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const exporter = useAnamnesisExport();
  const busy = pending || exporter.downloading || exporter.copying;

  async function load() {
    const result = await getAnamnesisExport(id);
    if (result.ok) return result.document;
    toast.error(result.message);
    return null;
  }

  function duplicate() {
    startTransition(async () => {
      const result = await duplicateAnamnesis(id);
      if (result.ok) toast.success("Cópia criada.");
      else toast.error(result.message);
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteAnamnesis(id);
      if (result.ok) toast.success("Anamnese excluída.");
      else toast.error(result.message);
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl text-muted-foreground"
            aria-label={`Ações da anamnese ${title}`}
            disabled={busy}
            onPointerEnter={preloadPdf}
          >
            {busy ? (
              <LoaderCircle className="animate-spin" aria-hidden />
            ) : (
              <EllipsisVertical aria-hidden />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem asChild>
            <Link href={`/anamneses/${id}`}>
              <FolderOpen aria-hidden />
              Abrir
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void exporter.download(load)}>
            <FileDown aria-hidden />
            Baixar PDF
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void exporter.copy(load)}>
            <ClipboardCopy aria-hidden />
            Copiar texto
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={duplicate}>
            <Copy aria-hidden />
            Duplicar
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirmOpen(true)}>
            <Trash2 aria-hidden />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir &quot;{title}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              As respostas serão apagadas de forma permanente. Não dá para desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={remove}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
