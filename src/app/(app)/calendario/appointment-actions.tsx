"use client";

import { useState, useTransition } from "react";
import { EllipsisVertical, LoaderCircle, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import type { Appointment } from "@/lib/data/calendar";
import { deleteAppointment } from "./actions";
import { AppointmentDialog } from "./appointment-dialog";

/** Botão que abre o diálogo de novo atendimento no dia indicado. */
export function NewAppointmentButton({
  date,
  variant = "default",
  label = "Novo atendimento",
}: {
  date: string;
  variant?: "default" | "outline";
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant={variant}
        size="lg"
        className="h-10 rounded-xl px-4"
        onClick={() => setOpen(true)}
      >
        <Plus aria-hidden />
        {label}
      </Button>
      <AppointmentDialog open={open} onOpenChange={setOpen} date={date} />
    </>
  );
}

export function AppointmentActions({ appointment }: { appointment: Appointment }) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const inSeries = Boolean(appointment.seriesId);

  function remove(scope: "one" | "following") {
    startTransition(async () => {
      const result = await deleteAppointment(appointment.id, scope);
      if (result.ok) {
        toast.success(scope === "following" ? "Atendimentos excluídos." : "Atendimento excluído.");
      } else {
        toast.error(result.message);
      }
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
            aria-label={`Ações do atendimento ${appointment.title}`}
            disabled={pending}
          >
            {pending ? (
              <LoaderCircle className="animate-spin" aria-hidden />
            ) : (
              <EllipsisVertical aria-hidden />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil aria-hidden />
            Editar
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirmOpen(true)}>
            <Trash2 aria-hidden />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AppointmentDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        date={appointment.date}
        appointment={appointment}
      />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir &quot;{appointment.title}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              {inSeries
                ? "Este atendimento se repete toda semana. Exclua só este dia ou este e os próximos. As anamneses não são afetadas."
                : "O atendimento sai do calendário. As anamneses não são afetadas."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            {inSeries ? (
              <AlertDialogAction variant="outline" onClick={() => remove("following")}>
                Este e os próximos
              </AlertDialogAction>
            ) : null}
            <AlertDialogAction variant="destructive" onClick={() => remove("one")}>
              {inSeries ? "Só este" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
