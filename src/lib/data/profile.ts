import "server-only";
import { cache } from "react";
import { requireUser } from "@/lib/auth";

export type Profile = {
  fullName: string | null;
  institution: string | null;
  email: string;
};

/** Perfil da pessoa logada (RLS garante que só o próprio é lido). */
export const getProfile = cache(async (): Promise<Profile> => {
  const { user, supabase } = await requireUser();
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, institution")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw new Error("Não foi possível carregar o perfil.");
  return {
    fullName: data?.full_name ?? null,
    institution: data?.institution ?? null,
    email: user.email,
  };
});
