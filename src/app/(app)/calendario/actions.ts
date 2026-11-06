"use server";

import { randomUUID } from "node:crypto";
import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { addDays } from "@/lib/calendar/dates";
import { appointmentInputSchema, deleteAppointmentSchema } from "@/lib/calendar/schema";
import { errorState, pickValues, successState, type FormState } from "@/lib/form-state";

export type AppointmentActionResult = { ok: true } | { ok: false; message: string };

const FIELDS = ["id", "title", "date", "startTime", "endTime", "location", "notes", "repeatUntil"];

/** Cria (com repetição semanal opcional) ou edita um atendimento. */
export async function saveAppointment(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = pickValues(formData, FIELDS);
  const repeatWeekly = formData.get("repeatWeekly") === "on";
  if (repeatWeekly) values.repeatWeekly = "on";

  const parsed = appointmentInputSchema.safeParse({
    ...Object.fromEntries(FIELDS.map((key) => [key, values[key] ?? ""])),
    repeatWeekly,
  });
  if (!parsed.success) {
    return errorState(
      "Confira os campos destacados.",
      z.flattenError(parsed.error).fieldErrors,
      values,
    );
  }
  const input = parsed.data;
  const fields = {
    title: input.title,
    date: input.date,
    start_time: input.startTime,
    end_time: input.endTime,
    location: input.location,
    notes: input.notes,
  };

  const { user, supabase } = await requireUser();

  if (input.id) {
    const { data, error } = await supabase
      .from("appointments")
      .update(fields)
      .eq("id", input.id)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();
    if (error) return errorState("Não foi possível salvar o atendimento.", undefined, values);
    if (!data) return errorState("Este atendimento não existe mais.", undefined, values);
    refresh();
    return successState("Atendimento salvo.");
  }

  const dates = [input.date];
  if (input.repeatWeekly) {
    for (let day = addDays(input.date, 7); day <= input.repeatUntil; day = addDays(day, 7)) {
      dates.push(day);
    }
  }
  const seriesId = dates.length > 1 ? randomUUID() : null;
  const { error } = await supabase
    .from("appointments")
    .insert(dates.map((date) => ({ ...fields, date, series_id: seriesId, user_id: user.id })));
  if (error) return errorState("Não foi possível salvar o atendimento.", undefined, values);

  refresh();
  return successState(
    dates.length > 1 ? `${dates.length} atendimentos marcados.` : "Atendimento marcado.",
  );
}

/** Exclui um atendimento ou ele e os próximos da mesma série. */
export async function deleteAppointment(
  id: string,
  scope: "one" | "following",
): Promise<AppointmentActionResult> {
  const parsed = deleteAppointmentSchema.safeParse({ id, scope });
  if (!parsed.success) return { ok: false, message: "Atendimento inválido." };

  const { user, supabase } = await requireUser();
  const { data: current, error: readError } = await supabase
    .from("appointments")
    .select("id, date, series_id")
    .eq("id", parsed.data.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (readError) return { ok: false, message: "Não foi possível excluir o atendimento." };
  if (!current) return { ok: false, message: "Este atendimento não existe mais." };

  let query = supabase.from("appointments").delete().eq("user_id", user.id);
  query =
    parsed.data.scope === "following" && current.series_id
      ? query.eq("series_id", current.series_id).gte("date", current.date)
      : query.eq("id", current.id);
  const { error } = await query;
  if (error) return { ok: false, message: "Não foi possível excluir o atendimento." };

  refresh();
  return { ok: true };
}
