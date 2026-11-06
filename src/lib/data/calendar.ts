import "server-only";
import { requireUser } from "@/lib/auth";
import { addDays, dayKeyOf, startOfDayInstant } from "@/lib/calendar/dates";

export type Appointment = {
  id: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  title: string;
  location: string;
  notes: string;
  seriesId: string | null;
};

export type CalendarAnamnesis = {
  id: string;
  title: string;
  patientLabel: string | null;
  templateTitle: string | null;
  /** Dia de criação (fuso de Brasília). */
  day: string;
  createdAt: string;
};

/** Teto por consulta: muito acima do uso real de um mês (~6 semanas). */
const MAX_ROWS = 2000;

/** Atendimentos e anamneses entre `from` e `to` (inclusive). */
export async function getCalendarRange(
  from: string,
  to: string,
): Promise<{ appointments: Appointment[]; anamneses: CalendarAnamnesis[] }> {
  const { user, supabase } = await requireUser();

  const [appointments, anamneses, templates] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, date, start_time, end_time, title, location, notes, series_id")
      .eq("user_id", user.id)
      .gte("date", from)
      .lte("date", to)
      .order("date")
      .order("start_time", { ascending: true, nullsFirst: true })
      .order("created_at")
      .limit(MAX_ROWS),
    supabase
      .from("anamneses")
      .select("id, title, patient_label, template_id, created_at")
      .eq("user_id", user.id)
      .gte("created_at", startOfDayInstant(from))
      .lt("created_at", startOfDayInstant(addDays(to, 1)))
      // Anamnese em branco não conta (decisão 27).
      .or("patient_label.not.is.null,answers.neq.{}")
      .order("created_at")
      .limit(MAX_ROWS),
    supabase.from("templates").select("id, title").eq("user_id", user.id),
  ]);
  if (appointments.error || anamneses.error || templates.error) {
    throw new Error("Não foi possível carregar o calendário.");
  }

  const titles = new Map(templates.data.map((row) => [row.id, row.title]));

  return {
    appointments: appointments.data.map((row) => ({
      id: row.id,
      date: row.date,
      startTime: row.start_time,
      endTime: row.end_time,
      title: row.title,
      location: row.location,
      notes: row.notes,
      seriesId: row.series_id,
    })),
    anamneses: anamneses.data.map((row) => ({
      id: row.id,
      title: row.title,
      patientLabel: row.patient_label,
      templateTitle: row.template_id ? (titles.get(row.template_id) ?? null) : null,
      day: dayKeyOf(row.created_at),
      createdAt: row.created_at,
    })),
  };
}
