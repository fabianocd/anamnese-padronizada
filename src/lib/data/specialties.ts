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
