import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { ChevronLeft, ChevronRight, FileText, MapPin, Repeat } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  addMonths,
  CALENDAR_TIME_ZONE,
  dayKeyOf,
  firstDayOf,
  formatDayLabel,
  formatDayTitle,
  formatMonthTitle,
  formatTime,
  isValidDateKey,
  monthGrid,
  monthKey,
  monthOf,
  parseMonthKey,
  sameMonth,
  type Month,
} from "@/lib/calendar/dates";
import { getCalendarRange, type Appointment, type CalendarAnamnesis } from "@/lib/data/calendar";
import { cn } from "@/lib/utils";
import { AppointmentActions, NewAppointmentButton } from "./appointment-actions";

export const metadata: Metadata = { title: "Calendário" };

const WEEKDAYS = [
  { short: "D", long: "Dom" },
  { short: "S", long: "Seg" },
  { short: "T", long: "Ter" },
  { short: "Q", long: "Qua" },
  { short: "Q", long: "Qui" },
  { short: "S", long: "Sex" },
  { short: "S", long: "Sáb" },
];

const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: CALENDAR_TIME_ZONE,
});

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function dayHref(month: Month, day: string): string {
  return `/calendario?mes=${monthKey(month)}&dia=${day}`;
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

function timeRange(appointment: Appointment): string {
  const start = formatTime(appointment.startTime);
  const end = formatTime(appointment.endTime);
  return start && end ? `${start}–${end}` : start;
}

function groupByDay<T>(items: T[], dayOf: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const day = dayOf(item);
    groups.set(day, [...(groups.get(day) ?? []), item]);
  }
  return groups;
}

export default function CalendarPage({ searchParams }: PageProps<"/calendario">) {
  return (
    <>
      <PageHeader
        title="Calendário"
        description="Programe seus dias de atendimento e veja as anamneses feitas em cada dia."
      />
      <Suspense fallback={<CalendarSkeleton />}>
        {searchParams.then((params) => (
          <CalendarContent month={first(params.mes)} day={first(params.dia)} />
        ))}
      </Suspense>
    </>
  );
}

async function CalendarContent({ month: monthParam, day: dayParam }: { month: string; day: string }) {
  // "Hoje" depende do momento do pedido, então nada de prerender.
  await connection();
  const today = dayKeyOf(new Date());
  const selectedParam = isValidDateKey(dayParam) ? dayParam : null;
  const month = parseMonthKey(monthParam) ?? monthOf(selectedParam ?? today);
  const selected =
    selectedParam && sameMonth(selectedParam, month)
      ? selectedParam
      : sameMonth(today, month)
        ? today
        : firstDayOf(month);

  const weeks = monthGrid(month);
  const lastWeek = weeks[weeks.length - 1];
  const { appointments, anamneses } = await getCalendarRange(weeks[0][0], lastWeek[6]);
  const appointmentsByDay = groupByDay(appointments, (item) => item.date);
  const anamnesesByDay = groupByDay(anamneses, (item) => item.day);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <section className="glass rounded-3xl p-3 sm:p-5" aria-labelledby="calendar-month">
        <div className="mb-3 flex items-center justify-between gap-2 sm:mb-4">
          <h2
            id="calendar-month"
            className="pl-1 font-heading text-lg font-semibold tracking-tight sm:text-xl"
          >
            {formatMonthTitle(month)}
          </h2>
          <div className="flex items-center gap-1">
            <Button asChild variant="ghost" size="icon" className="rounded-xl">
              <Link
                href={`/calendario?mes=${monthKey(addMonths(month, -1))}`}
                scroll={false}
                aria-label="Mês anterior"
              >
                <ChevronLeft aria-hidden />
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="rounded-xl px-3">
              <Link href="/calendario" scroll={false}>
                Hoje
              </Link>
            </Button>
            <Button asChild variant="ghost" size="icon" className="rounded-xl">
              <Link
                href={`/calendario?mes=${monthKey(addMonths(month, 1))}`}
                scroll={false}
                aria-label="Próximo mês"
              >
                <ChevronRight aria-hidden />
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 pb-1 text-center text-xs font-medium text-muted-foreground">
          {WEEKDAYS.map((weekday) => (
            <div key={weekday.long} aria-hidden>
              <span className="sm:hidden">{weekday.short}</span>
              <span className="hidden sm:inline">{weekday.long}</span>
            </div>
          ))}
        </div>

        <ul className="grid grid-cols-7 gap-1">
          {weeks.flat().map((day) => (
            <li key={day}>
              <DayCell
                day={day}
                month={month}
                today={today}
                selected={selected}
                appointments={appointmentsByDay.get(day) ?? []}
                anamneses={anamnesesByDay.get(day) ?? []}
              />
            </li>
          ))}
        </ul>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 px-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-chart-4" aria-hidden />
            Atendimento marcado
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-chart-1" aria-hidden />
            Anamnese feita
          </span>
        </div>
      </section>

      <DayPanel
        day={selected}
        today={today}
        appointments={appointmentsByDay.get(selected) ?? []}
        anamneses={anamnesesByDay.get(selected) ?? []}
      />
    </div>
  );
}

function DayCell({
  day,
  month,
  today,
  selected,
  appointments,
  anamneses,
}: {
  day: string;
  month: Month;
  today: string;
  selected: string;
  appointments: Appointment[];
  anamneses: CalendarAnamnesis[];
}) {
  const outside = !sameMonth(day, month);
  const isToday = day === today;
  const isSelected = day === selected;
  const extra = appointments.length - 2;
  const summary = [
    formatDayLabel(day),
    isToday ? "hoje" : null,
    appointments.length ? plural(appointments.length, "atendimento", "atendimentos") : null,
    anamneses.length ? plural(anamneses.length, "anamnese", "anamneses") : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Link
      href={dayHref(outside ? monthOf(day) : month, day)}
      scroll={false}
      prefetch={false}
      aria-label={summary}
      aria-current={isSelected ? "date" : undefined}
      className={cn(
        "flex h-full min-h-14 flex-col items-center gap-1 rounded-xl border p-1 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:min-h-24 sm:items-stretch sm:p-1.5",
        isSelected
          ? "border-primary/60 bg-primary/10"
          : "border-transparent hover:bg-accent",
        outside && !isSelected && "opacity-45",
      )}
    >
      <span
        className={cn(
          "grid size-7 shrink-0 place-items-center rounded-full text-sm tabular-nums",
          isToday ? "bg-primary font-semibold text-primary-foreground" : "font-medium",
        )}
      >
        {Number(day.slice(8))}
      </span>

      {/* Desktop: até 2 atendimentos por extenso e o total de anamneses. */}
      <span className="hidden min-w-0 flex-col gap-1 sm:flex">
        {appointments.slice(0, 2).map((appointment) => (
          <span
            key={appointment.id}
            className="truncate rounded-md border-l-2 border-chart-4 bg-chart-4/12 px-1.5 py-0.5 text-[0.7rem] leading-tight"
          >
            {appointment.startTime ? (
              <span className="tabular-nums text-muted-foreground">
                {formatTime(appointment.startTime)}{" "}
              </span>
            ) : null}
            {appointment.title}
          </span>
        ))}
        {extra > 0 ? (
          <span className="px-1.5 text-[0.7rem] text-muted-foreground">+{extra} mais</span>
        ) : null}
      </span>
      {anamneses.length > 0 ? (
        <span className="mt-auto hidden items-center gap-1 self-start rounded-full bg-chart-1/15 px-1.5 py-0.5 text-[0.7rem] font-medium tabular-nums sm:inline-flex">
          <FileText className="size-3 text-chart-1" aria-hidden />
          {anamneses.length}
        </span>
      ) : null}

      {/* Celular: só os pontos. */}
      <span className="mt-auto flex gap-1 sm:hidden" aria-hidden>
        {appointments.length > 0 ? <span className="size-1.5 rounded-full bg-chart-4" /> : null}
        {anamneses.length > 0 ? <span className="size-1.5 rounded-full bg-chart-1" /> : null}
      </span>
    </Link>
  );
}

function DayPanel({
  day,
  today,
  appointments,
  anamneses,
}: {
  day: string;
  today: string;
  appointments: Appointment[];
  anamneses: CalendarAnamnesis[];
}) {
  return (
    <aside className="glass flex flex-col gap-6 rounded-3xl p-4 sm:p-5" aria-labelledby="day-title">
      <div>
        {day === today ? (
          <p className="text-xs font-semibold tracking-wider text-primary uppercase">Hoje</p>
        ) : null}
        <h2 id="day-title" className="font-heading text-xl font-semibold tracking-tight">
          {formatDayTitle(day)}
        </h2>
      </div>

      <section className="flex flex-col gap-3" aria-labelledby="day-appointments">
        <div className="flex items-center justify-between gap-2">
          <h3 id="day-appointments" className="text-sm font-semibold">
            Atendimentos
          </h3>
          <NewAppointmentButton date={day} variant="outline" label="Marcar" />
        </div>
        {appointments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum atendimento marcado.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {appointments.map((appointment) => (
              <li
                key={appointment.id}
                className="flex items-start gap-2 rounded-2xl border-l-4 border-chart-4 bg-chart-4/8 py-2.5 pr-1 pl-3"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p className="font-medium break-words">{appointment.title}</p>
                  {appointment.startTime || appointment.location || appointment.seriesId ? (
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-muted-foreground">
                      {appointment.startTime ? (
                        <span className="tabular-nums">{timeRange(appointment)}</span>
                      ) : null}
                      {appointment.location ? (
                        <span className="inline-flex min-w-0 items-center gap-1">
                          <MapPin className="size-3.5 shrink-0" aria-hidden />
                          <span className="break-words">{appointment.location}</span>
                        </span>
                      ) : null}
                      {appointment.seriesId ? (
                        <span className="inline-flex items-center gap-1">
                          <Repeat className="size-3.5" aria-hidden />
                          Semanal
                        </span>
                      ) : null}
                    </p>
                  ) : null}
                  {appointment.notes ? (
                    <p className="mt-1 line-clamp-4 text-sm whitespace-pre-line text-muted-foreground">
                      {appointment.notes}
                    </p>
                  ) : null}
                </div>
                <AppointmentActions appointment={appointment} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="day-anamneses">
        <h3 id="day-anamneses" className="text-sm font-semibold">
          Anamneses{anamneses.length ? ` (${anamneses.length})` : ""}
        </h3>
        {anamneses.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma anamnese feita neste dia.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {anamneses.map((anamnesis) => (
              <li key={anamnesis.id}>
                <Link
                  href={`/anamneses/${anamnesis.id}`}
                  className="flex flex-col gap-1 rounded-2xl border border-border/60 px-3 py-2.5 transition-colors outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="min-w-0 truncate font-medium">{anamnesis.title}</span>
                    {anamnesis.patientLabel ? (
                      <Badge variant="secondary">{anamnesis.patientLabel}</Badge>
                    ) : null}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    <span className="tabular-nums">
                      {timeFormatter.format(new Date(anamnesis.createdAt))}
                    </span>
                    {" · "}
                    {anamnesis.templateTitle ?? "Modelo excluído"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}

function CalendarSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]" aria-busy>
      <Skeleton className="h-[26rem] rounded-3xl sm:h-[38rem]" />
      <Skeleton className="h-72 rounded-3xl" />
    </div>
  );
}
