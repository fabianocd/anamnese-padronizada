import "server-only";
import { requireUser } from "@/lib/auth";
import { DOCS_BUCKET, listAllFiles } from "@/lib/storage";
import { editableTemplateSchema, type EditableTemplate } from "@/lib/templates/schema";

export type TemplateSummary = {
  id: string;
  title: string;
  specialtyId: string | null;
  specialtyName: string | null;
  isDefault: boolean;
  sectionCount: number;
  fieldCount: number;
  updatedAt: string;
};

export type TemplateDetail = {
  id: string;
  title: string;
  specialtyId: string | null;
  isDefault: boolean;
  schema: EditableTemplate;
  sourceFilePath: string | null;
  updatedAt: string;
};

export type SourceFileLink = { name: string; url: string };

function parseSchema(raw: unknown): EditableTemplate {
  const parsed = editableTemplateSchema.safeParse(raw);
  return parsed.success ? parsed.data : { sections: [] };
}

/** Ids dos modelos que são padrão da própria especialidade. */
async function defaultTemplateIds(): Promise<Map<string, string>> {
  const { user, supabase } = await requireUser();
  const { data, error } = await supabase
    .from("specialties")
    .select("id, default_template_id")
    .eq("user_id", user.id)
    .not("default_template_id", "is", null);
  if (error) throw new Error("Não foi possível carregar as especialidades.");
  // modelo -> especialidade da qual é padrão
  return new Map(data.map((row) => [row.default_template_id as string, row.id]));
}

export async function listTemplates(): Promise<TemplateSummary[]> {
  const { user, supabase } = await requireUser();
  const [templates, specialties, defaults] = await Promise.all([
    supabase
      .from("templates")
      .select("id, title, specialty_id, schema, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false }),
    supabase.from("specialties").select("id, name").eq("user_id", user.id),
    defaultTemplateIds(),
  ]);
  if (templates.error || specialties.error) {
    throw new Error("Não foi possível carregar os modelos.");
  }

  const specialtyNames = new Map(specialties.data.map((row) => [row.id, row.name]));
  return templates.data.map((row) => {
    const schema = parseSchema(row.schema);
    return {
      id: row.id,
      title: row.title,
      specialtyId: row.specialty_id,
      specialtyName: row.specialty_id ? (specialtyNames.get(row.specialty_id) ?? null) : null,
      isDefault: row.specialty_id !== null && defaults.get(row.id) === row.specialty_id,
      sectionCount: schema.sections.length,
      fieldCount: schema.sections.reduce((sum, section) => sum + section.fields.length, 0),
      updatedAt: row.updated_at,
    };
  });
}

/** Modelo da pessoa logada, ou null se não existir (ou for de outra conta). */
export async function getTemplate(id: string): Promise<TemplateDetail | null> {
  const { user, supabase } = await requireUser();
  const [template, defaults] = await Promise.all([
    supabase
      .from("templates")
      .select("id, title, specialty_id, schema, source_file_path, updated_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
    defaultTemplateIds(),
  ]);
  if (template.error) throw new Error("Não foi possível carregar o modelo.");
  const row = template.data;
  if (!row) return null;

  return {
    id: row.id,
    title: row.title,
    specialtyId: row.specialty_id,
    isDefault: row.specialty_id !== null && defaults.get(row.id) === row.specialty_id,
    schema: parseSchema(row.schema),
    sourceFilePath: row.source_file_path,
    updatedAt: row.updated_at,
  };
}

/** Links temporários (10 min) para os arquivos originais do modelo. */
export async function getSourceFileLinks(folder: string): Promise<SourceFileLink[]> {
  const { supabase } = await requireUser();
  try {
    const paths = await listAllFiles(supabase, folder);
    if (paths.length === 0) return [];
    const { data, error } = await supabase.storage
      .from(DOCS_BUCKET)
      .createSignedUrls(paths, 600);
    if (error) return [];
    return data.flatMap((item, index) =>
      item.signedUrl
        ? [{ name: paths[index].split("/").pop() ?? `arquivo-${index + 1}`, url: item.signedUrl }]
        : [],
    );
  } catch {
    return [];
  }
}
