import "server-only";
import { requireUser } from "@/lib/auth";

export type Specialty = { id: string; name: string };

export async function listSpecialties(): Promise<Specialty[]> {
  const { user, supabase } = await requireUser();
  const { data, error } = await supabase
    .from("specialties")
    .select("id, name")
    .eq("user_id", user.id)
    .order("name");
  if (error) throw new Error("Não foi possível carregar as especialidades.");
  return data;
}

export type SpecialtyOption = Specialty & {
  defaultTemplateId: string | null;
  defaultTemplateTitle: string | null;
};

/** Especialidades com o modelo padrão de cada uma (para o editor de modelo). */
export async function listSpecialtyOptions(): Promise<SpecialtyOption[]> {
  const { user, supabase } = await requireUser();
  const [specialties, templates] = await Promise.all([
    supabase
      .from("specialties")
      .select("id, name, default_template_id")
      .eq("user_id", user.id)
      .order("name"),
    supabase.from("templates").select("id, title").eq("user_id", user.id),
  ]);
  if (specialties.error || templates.error) {
    throw new Error("Não foi possível carregar as especialidades.");
  }
  const titles = new Map(templates.data.map((row) => [row.id, row.title]));
  return specialties.data.map((row) => ({
    id: row.id,
    name: row.name,
    defaultTemplateId: row.default_template_id,
    defaultTemplateTitle: row.default_template_id
      ? (titles.get(row.default_template_id) ?? null)
      : null,
  }));
}
