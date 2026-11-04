import { z } from "zod";

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, { error: message })
    .transform((value) => (value === "" ? null : value));

export const profileSchema = z.object({
  fullName: optionalText(120, "Nome muito longo (máx. 120 caracteres)."),
  institution: optionalText(160, "Instituição muito longa (máx. 160 caracteres)."),
});

export const specialtyNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "Informe o nome da especialidade." })
    .max(80, { error: "Nome muito longo (máx. 80 caracteres)." }),
});

export const specialtyIdSchema = z.object({ id: z.uuid() });

export const DELETE_CONFIRMATION = "EXCLUIR";

export const deleteAccountSchema = z.object({
  confirmation: z.literal(DELETE_CONFIRMATION, {
    error: `Digite ${DELETE_CONFIRMATION} para confirmar.`,
  }),
});
