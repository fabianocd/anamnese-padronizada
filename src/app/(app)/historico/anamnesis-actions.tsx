"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Copy, EllipsisVertical, FolderOpen, LoaderCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteAnamnesis, duplicateAnamnesis } from "@/app/(app)/anamneses/actions";
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
            disabled={pending}
          >
            {pending ? (
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
