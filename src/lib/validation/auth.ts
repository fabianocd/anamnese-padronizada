import { z } from "zod";

export const PASSWORD_MIN = 8;

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Informe um e-mail válido." }));

const password = z
  .string()
  .min(PASSWORD_MIN, { error: `A senha precisa ter pelo menos ${PASSWORD_MIN} caracteres.` })
  .max(72, { error: "A senha pode ter no máximo 72 caracteres." });

export const signInSchema = z.object({
  email,
  password: z.string().min(1, { error: "Informe a senha." }),
  next: z.string().optional(),
});

export const signUpSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(1, { error: "Informe seu nome." })
      .max(120, { error: "Nome muito longo." }),
    email,
    password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "As senhas não conferem.",
    path: ["confirmPassword"],
  });

export const resetRequestSchema = z.object({ email });

export const newPasswordSchema = z
  .object({ password, confirmPassword: z.string() })
  .refine((data) => data.password === data.confirmPassword, {
    error: "As senhas não conferem.",
    path: ["confirmPassword"],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { error: "Informe a senha atual." }),
    password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "As senhas não conferem.",
    path: ["confirmPassword"],
  });
