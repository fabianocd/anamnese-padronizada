import { templateDraftSchema, type TemplateDraft } from "./schema";

/**
 * O rascunho do modelo fica no sessionStorage até a pessoa salvar no editor
 * (só nesta aba; some ao fechar). Nada aqui vai para o banco.
 */
const DRAFT_KEY = "anamnese:template-draft";
const EVENT = "anamnese:template-draft-change";

export function saveTemplateDraft(draft: TemplateDraft): boolean {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    window.dispatchEvent(new Event(EVENT));
    return true;
  } catch {
    return false;
  }
}

export function clearTemplateDraft(): void {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // Sem storage disponível: nada a limpar.
  }
}

/** Texto cru do rascunho (estável entre leituras, para useSyncExternalStore). */
export function readTemplateDraftRaw(): string | null {
  try {
    return sessionStorage.getItem(DRAFT_KEY);
  } catch {
    return null;
  }
}

export function parseTemplateDraft(raw: string | null): TemplateDraft | null {
  if (!raw) return null;
  try {
    const parsed = templateDraftSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function subscribeTemplateDraft(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
