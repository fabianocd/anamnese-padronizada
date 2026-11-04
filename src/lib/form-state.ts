/** Estado devolvido pelas Server Actions de formulário (usado com useActionState). */
export type FormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  /**
   * Valores enviados (nunca senhas), para repor nos campos: o React limpa o
   * formulário depois de cada envio.
   */
  values?: Record<string, string>;
  /** Muda a cada envio, para o client reagir (ex.: limpar campos, toast). */
  submittedAt?: number;
};

export const initialFormState: FormState = { status: "idle" };

export function errorState(
  message: string,
  fieldErrors?: FormState["fieldErrors"],
  values?: FormState["values"],
): FormState {
  return { status: "error", message, fieldErrors, values, submittedAt: Date.now() };
}

export function successState(message?: string, values?: FormState["values"]): FormState {
  return { status: "success", message, values, submittedAt: Date.now() };
}

/** Copia só os campos de texto indicados do FormData (para `values`). */
export function pickValues(formData: FormData, keys: string[]): Record<string, string> {
  const values: Record<string, string> = {};
  for (const key of keys) {
    const value = formData.get(key);
    if (typeof value === "string") values[key] = value;
  }
  return values;
}
