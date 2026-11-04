import "server-only";
import { requireUser } from "@/lib/auth";
import { answersSchema, countAnswered, type Answers } from "@/lib/anamneses/answers";
import { editableTemplateSchema, type EditableTemplate } from "@/lib/templates/schema";

export type AnamnesisDetail = {
  id: string;
  title: string;
  patientLabel: string;
  templateId: string | null;
  /** Título atual do modelo de origem (null se foi excluído). */
  templateTitle: string | null;
  snapshot: EditableTemplate;
  answers: Answers;
  createdAt: string;
  updatedAt: string;
};

export type AnamnesisSummary = {
  id: string;
  title: string;
  patientLabel: string | null;
  templateId: string | null;
  templateTitle: string | null;
  answered: number;
  total: number;
  createdAt: string;
  updatedAt: string;
};

export const HISTORY_PAGE_SIZE = 30;

export function parseSnapshot(raw: unknown): EditableTemplate {
  const parsed = editableTemplateSchema.safeParse(raw);
  return parsed.success ? parsed.data : { sections: [] };
}

function parseAnswers(raw: unknown): Answers {
  const parsed = answersSchema.safeParse(raw);
  return parsed.success ? parsed.data : {};
}

export async function getAnamnesis(id: string): Promise<AnamnesisDetail | null> {
  const { user, supabase } = await requireUser();
  const { data, error } = await supabase
    .from("anamneses")
    .select(
      "id, title, patient_label, template_id, template_snapshot, answers, created_at, updated_at",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw new Error("Não foi possível carregar a anamnese.");
  if (!data) return null;

  let templateTitle: string | null = null;
  if (data.template_id) {
    const { data: template } = await supabase
      .from("templates")
      .select("title")
      .eq("id", data.template_id)
      .eq("user_id", user.id)
      .maybeSingle();
    templateTitle = template?.title ?? null;
  }

  return {
    id: data.id,
    title: data.title,
    patientLabel: data.patient_label ?? "",
    templateId: data.template_id,
    templateTitle,
    snapshot: parseSnapshot(data.template_snapshot),
    answers: parseAnswers(data.answers),
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/** Valor seguro para um filtro `ilike` dentro de `.or()` do PostgREST. */
function ilikeValue(search: string): string {
  const pattern = `%${search.replace(/[\\%_]/g, "\\$&")}%`;
  return `"${pattern.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export async function listAnamneses(options: {
  search?: string;
  templateId?: string;
  page?: number;
}): Promise<{ items: AnamnesisSummary[]; hasMore: boolean }> {
  const { user, supabase } = await requireUser();
  const page = Math.max(1, options.page ?? 1);
  const from = (page - 1) * HISTORY_PAGE_SIZE;

  let query = supabase
    .from("anamneses")
    .select("id, title, patient_label, template_id, template_snapshot, answers, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    // Um a mais para saber se há próxima página.
    .range(from, from + HISTORY_PAGE_SIZE);

  if (options.templateId) query = query.eq("template_id", options.templateId);
  const search = options.search?.trim();
  if (search) {
    const value = ilikeValue(search);
    query = query.or(`title.ilike.${value},patient_label.ilike.${value}`);
  }

  const [anamneses, templates] = await Promise.all([
    query,
    supabase.from("templates").select("id, title").eq("user_id", user.id),
  ]);
  if (anamneses.error || templates.error) {
    throw new Error("Não foi possível carregar o histórico.");
  }

  const titles = new Map(templates.data.map((row) => [row.id, row.title]));
  const rows = anamneses.data.slice(0, HISTORY_PAGE_SIZE);

  return {
    hasMore: anamneses.data.length > HISTORY_PAGE_SIZE,
    items: rows.map((row) => {
      const { answered, total } = countAnswered(
        parseSnapshot(row.template_snapshot),
        parseAnswers(row.answers),
      );
      return {
        id: row.id,
        title: row.title,
        patientLabel: row.patient_label,
        templateId: row.template_id,
        templateTitle: row.template_id ? (titles.get(row.template_id) ?? null) : null,
        answered,
        total,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    }),
  };
}

export type TemplateOption = { id: string; title: string };

/** Modelos da pessoa (só id e título), para o filtro do histórico. */
export async function listTemplateOptions(): Promise<TemplateOption[]> {
  const { user, supabase } = await requireUser();
  const { data, error } = await supabase
    .from("templates")
    .select("id, title")
    .eq("user_id", user.id)
    .order("title");
  if (error) throw new Error("Não foi possível carregar os modelos.");
  return data;
}
