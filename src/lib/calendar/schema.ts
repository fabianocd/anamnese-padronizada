import { z } from "zod";
import { daysBetween, isValidDateKey } from "./dates";

export const APPOINTMENT_LIMITS = { title: 120, location: 120, notes: 2000 } as const;

/** A repetição semanal vai até 1 ano depois do primeiro dia. */
export const MAX_REPEAT_DAYS = 366;

const dateKeySchema = (message: string) =>
  z.string().trim().refine(isValidDateKey, message);

const timeSchema = z
  .string()
  .trim()
  .refine((value) => value === "" || /^([01]\d|2[0-3]):[0-5]\d$/.test(value), "Horário inválido.")
  .transform((value) => value || null);

export const appointmentInputSchema = z
  .object({
    id: z.union([z.literal(""), z.uuid()]).transform((value) => value || null),
    title: z
      .string()
      .trim()
      .min(1, "Dê um nome ao atendimento.")
      .max(APPOINTMENT_LIMITS.title, `Máximo de ${APPOINTMENT_LIMITS.title} caracteres.`),
    date: dateKeySchema("Escolha uma data válida."),
    startTime: timeSchema,
    endTime: timeSchema,
    location: z
      .string()
      .trim()
      .max(APPOINTMENT_LIMITS.location, `Máximo de ${APPOINTMENT_LIMITS.location} caracteres.`),
    notes: z
      .string()
      .trim()
      .max(APPOINTMENT_LIMITS.notes, `Máximo de ${APPOINTMENT_LIMITS.notes} caracteres.`),
    repeatWeekly: z.boolean(),
    repeatUntil: z.string().trim(),
  })
  .superRefine((value, ctx) => {
    if (value.endTime && !value.startTime) {
      ctx.addIssue({ code: "custom", path: ["startTime"], message: "Informe o início." });
    } else if (value.startTime && value.endTime && value.endTime <= value.startTime) {
      ctx.addIssue({ code: "custom", path: ["endTime"], message: "O fim deve ser depois do início." });
    }

    // Repetição só na criação.
    if (!value.repeatWeekly || value.id) return;
    if (!isValidDateKey(value.repeatUntil)) {
      ctx.addIssue({ code: "custom", path: ["repeatUntil"], message: "Escolha até quando repetir." });
      return;
    }
    if (!isValidDateKey(value.date)) return;
    const span = daysBetween(value.date, value.repeatUntil);
    if (span < 7) {
      ctx.addIssue({
        code: "custom",
        path: ["repeatUntil"],
        message: "Escolha uma data pelo menos 1 semana depois.",
      });
    } else if (span > MAX_REPEAT_DAYS) {
      ctx.addIssue({ code: "custom", path: ["repeatUntil"], message: "A repetição vai até 1 ano." });
    }
  });

export type AppointmentInput = z.infer<typeof appointmentInputSchema>;

export const deleteAppointmentSchema = z.object({
  id: z.uuid(),
  scope: z.enum(["one", "following"]),
});
