"use client";

import {
  useActionState,
  useEffect,
  useEffectEvent,
  useId,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { FormAlert } from "@/components/forms/form-alert";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { addDays, formatTime, weekdayOf } from "@/lib/calendar/dates";
import { APPOINTMENT_LIMITS, MAX_REPEAT_DAYS } from "@/lib/calendar/schema";
import type { Appointment } from "@/lib/data/calendar";
import { initialFormState } from "@/lib/form-state";
import { saveAppointment } from "./actions";

const EVERY_WEEKDAY = [
  "todo domingo",
  "toda segunda",
  "toda terça",
  "toda quarta",
  "toda quinta",
  "toda sexta",
  "todo sábado",
];

type AppointmentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Dia sugerido ao criar. */
  date: string;
  /** Atendimento a editar (sem ele, cria um novo). */
  appointment?: Appointment;
};

export function AppointmentDialog({ open, onOpenChange, date, appointment }: AppointmentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{appointment ? "Editar atendimento" : "Novo atendimento"}</DialogTitle>
          <DialogDescription>
            Plantão, ambulatório, estágio... Não registre dados de pacientes aqui.
          </DialogDescription>
        </DialogHeader>
        {/* Montado só com o diálogo aberto: cada abertura começa limpa. */}
        <AppointmentForm
          date={date}
          appointment={appointment}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function AppointmentForm({
  date,
  appointment,
  onDone,
}: {
  date: string;
  appointment?: Appointment;
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState(saveAppointment, initialFormState);
  const values = state.status === "error" ? state.values : undefined;
  const errors = state.fieldErrors;
  const [day, setDay] = useState(values?.date ?? appointment?.date ?? date);
  const [repeat, setRepeat] = useState(values?.repeatWeekly === "on");
  const repeatId = useId();
  const notesId = useId();

  const finish = useEffectEvent((message?: string) => {
    if (message) toast.success(message);
    onDone();
  });
  useEffect(() => {
    if (state.status === "success") finish(state.message);
  }, [state]);

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.status === "error" && state.message ? (
        <FormAlert tone="error">{state.message}</FormAlert>
      ) : null}

      <input type="hidden" name="id" value={appointment?.id ?? ""} />

      <FormField
        label="Nome"
        name="title"
        placeholder="Ex.: Ambulatório de Pediatria"
        maxLength={APPOINTMENT_LIMITS.title}
        defaultValue={values?.title ?? appointment?.title ?? ""}
        errors={errors?.title}
        autoFocus={!appointment}
        required
      />

      <FormField
        label="Data"
        name="date"
        type="date"
        value={day}
        onChange={(event) => setDay(event.target.value)}
        errors={errors?.date}
        required
      />

      <div className="grid grid-cols-2 gap-3">
        <FormField
          label="Início"
          name="startTime"
          type="time"
          defaultValue={values?.startTime ?? formatTime(appointment?.startTime ?? null)}
          errors={errors?.startTime}
        />
        <FormField
          label="Fim"
          name="endTime"
          type="time"
          defaultValue={values?.endTime ?? formatTime(appointment?.endTime ?? null)}
          errors={errors?.endTime}
        />
      </div>

      <FormField
        label="Local"
        name="location"
        placeholder="Ex.: UBS Centro"
        maxLength={APPOINTMENT_LIMITS.location}
        defaultValue={values?.location ?? appointment?.location ?? ""}
        errors={errors?.location}
      />

      <div className="flex flex-col gap-2">
        <Label htmlFor={notesId}>Observação</Label>
        <Textarea
          id={notesId}
          name="notes"
          rows={3}
          maxLength={APPOINTMENT_LIMITS.notes}
          defaultValue={values?.notes ?? appointment?.notes ?? ""}
          aria-invalid={errors?.notes ? true : undefined}
          className="rounded-xl"
        />
        {errors?.notes ? (
          <p className="text-xs font-medium text-destructive">{errors.notes[0]}</p>
        ) : null}
      </div>

      {appointment ? (
        appointment.seriesId ? (
          <p className="text-xs text-muted-foreground">
            Este atendimento faz parte de uma repetição; a alteração vale só para este dia.
          </p>
        ) : null
      ) : (
        <RepeatFields
          id={repeatId}
          day={day}
          repeat={repeat}
          onRepeatChange={setRepeat}
          defaultUntil={values?.repeatUntil}
          errors={errors?.repeatUntil}
        />
      )}

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="ghost" size="lg" className="h-10 rounded-xl px-4">
            Cancelar
          </Button>
        </DialogClose>
        <SubmitButton pending={pending} pendingLabel="Salvando…">
          {appointment ? "Salvar" : "Marcar"}
        </SubmitButton>
      </DialogFooter>
    </form>
  );
}

function RepeatFields({
  id,
  day,
  repeat,
  onRepeatChange,
  defaultUntil,
  errors,
}: {
  id: string;
  day: string;
  repeat: boolean;
  onRepeatChange: (value: boolean) => void;
  defaultUntil?: string;
  errors?: string[];
}): ReactNode {
  const validDay = /^\d{4}-\d{2}-\d{2}$/.test(day);
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/60 p-3">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id} className="leading-snug">
          Repetir toda semana
          {validDay ? (
            <span className="font-normal text-muted-foreground"> ({EVERY_WEEKDAY[weekdayOf(day)]})</span>
          ) : null}
        </Label>
        <Switch
          id={id}
          name="repeatWeekly"
          checked={repeat}
          onCheckedChange={onRepeatChange}
        />
      </div>
      {repeat ? (
        <FormField
          label="Até"
          name="repeatUntil"
          type="date"
          min={validDay ? addDays(day, 7) : undefined}
          max={validDay ? addDays(day, MAX_REPEAT_DAYS) : undefined}
          defaultValue={defaultUntil ?? ""}
          errors={errors}
          hint="Cria um atendimento por semana até essa data (máx. 1 ano). Cada um pode ser editado ou excluído depois."
        />
      ) : null}
    </div>
  );
}
