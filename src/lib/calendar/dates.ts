/**
 * Datas do calendário como chaves "AAAA-MM-DD", sempre no fuso de Brasília.
 * O Brasil não tem mais horário de verão, então o deslocamento é fixo (-03:00).
 */
export const CALENDAR_TIME_ZONE = "America/Sao_Paulo";
const UTC_OFFSET = "-03:00";

const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_KEY = /^(\d{4})-(\d{2})$/;

const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: CALENDAR_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export type Month = { year: number; month: number };

function toUtcDate(key: string): Date {
  const [, y, m, d] = DATE_KEY.exec(key) ?? [];
  return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
}

function fromUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** "AAAA-MM-DD" que existe de verdade (sem 31/02), entre 2000 e 2100. */
export function isValidDateKey(key: string): boolean {
  const match = DATE_KEY.exec(key);
  if (!match) return false;
  const year = Number(match[1]);
  if (year < 2000 || year > 2100) return false;
  return fromUtcDate(toUtcDate(key)) === key;
}

/** Dia (no fuso de Brasília) de um instante, ex.: created_at. */
export function dayKeyOf(instant: Date | string): string {
  return dayKeyFormatter.format(typeof instant === "string" ? new Date(instant) : instant);
}

export function addDays(key: string, days: number): string {
  const date = toUtcDate(key);
  date.setUTCDate(date.getUTCDate() + days);
  return fromUtcDate(date);
}

/** Diferença em dias (b - a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((toUtcDate(b).getTime() - toUtcDate(a).getTime()) / 86_400_000);
}

/** 0 = domingo ... 6 = sábado. */
export function weekdayOf(key: string): number {
  return toUtcDate(key).getUTCDay();
}

/** Início do dia em Brasília, como timestamp para comparar com created_at. */
export function startOfDayInstant(key: string): string {
  return `${key}T00:00:00${UTC_OFFSET}`;
}

export function monthOf(key: string): Month {
  const date = toUtcDate(key);
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

export function parseMonthKey(value: string): Month | null {
  const match = MONTH_KEY.exec(value);
  if (!match) return null;
  const month = { year: Number(match[1]), month: Number(match[2]) };
  return month.month >= 1 && month.month <= 12 && isValidDateKey(firstDayOf(month))
    ? month
    : null;
}

export function monthKey({ year, month }: Month): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function firstDayOf(month: Month): string {
  return `${monthKey(month)}-01`;
}

export function addMonths({ year, month }: Month, delta: number): Month {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export function sameMonth(key: string, month: Month): boolean {
  return key.startsWith(`${monthKey(month)}-`);
}

/** Semanas (domingo a sábado) que cobrem o mês, com dias dos meses vizinhos. */
export function monthGrid(month: Month): string[][] {
  const first = firstDayOf(month);
  const start = addDays(first, -weekdayOf(first));
  const next = firstDayOf(addMonths(month, 1));
  const weeks: string[][] = [];
  for (let day = start; day < next; ) {
    const week: string[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(day);
      day = addDays(day, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

const monthTitleFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const dayTitleFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});
const dayLabelFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});
const shortDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "Novembro de 2026" */
export function formatMonthTitle(month: Month): string {
  return capitalize(monthTitleFormatter.format(toUtcDate(firstDayOf(month))));
}

/** "Sexta-feira, 6 de novembro" */
export function formatDayTitle(key: string): string {
  return capitalize(dayTitleFormatter.format(toUtcDate(key)));
}

/** "6 de novembro" */
export function formatDayLabel(key: string): string {
  return dayLabelFormatter.format(toUtcDate(key));
}

/** "06/11/2026" */
export function formatShortDate(key: string): string {
  return shortDateFormatter.format(toUtcDate(key));
}

/** "08:00:00" (Postgres) → "08:00" */
export function formatTime(value: string | null): string {
  return value ? value.slice(0, 5) : "";
}
