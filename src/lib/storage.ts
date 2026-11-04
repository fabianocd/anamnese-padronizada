import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DOCS_BUCKET } from "@/lib/uploads";

export { DOCS_BUCKET };

/** Lista recursivamente todos os arquivos dentro de uma pasta do bucket. */
export async function listAllFiles(
  supabase: SupabaseClient,
  folder: string,
): Promise<string[]> {
  const paths: string[] = [];
  const pageSize = 100;

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase.storage
      .from(DOCS_BUCKET)
      .list(folder, { limit: pageSize, offset });
    if (error) throw error;

    for (const item of data) {
      const path = `${folder}/${item.name}`;
      // Pastas vêm sem id.
      if (item.id === null) paths.push(...(await listAllFiles(supabase, path)));
      else paths.push(path);
    }
    if (data.length < pageSize) break;
  }

  return paths;
}
