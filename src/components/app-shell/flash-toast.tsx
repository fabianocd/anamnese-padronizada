"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

const messages: Record<string, string> = {
  "senha-alterada": "Senha alterada com sucesso.",
  "conta-confirmada": "E-mail confirmado. Bem-vindo(a)!",
  "modelo-criado": "Modelo salvo na sua conta.",
  "modelo-excluido": "Modelo excluído.",
  "anamnese-excluida": "Anamnese excluída.",
  "nota-excluida": "Nota excluída.",
};

const errors: Record<string, string> = {
  "modelo-indisponivel": "Esse modelo não está mais disponível. Escolha outro.",
  "erro-ao-criar": "Não foi possível criar a anamnese. Tente de novo.",
  "erro-ao-criar-nota": "Não foi possível criar a nota. Tente de novo.",
};

/** Mostra um toast para `?aviso=...` e limpa o parâmetro da URL. */
export function FlashToast() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const notice = searchParams.get("aviso");

  useEffect(() => {
    if (!notice) return;
    const message = messages[notice];
    if (message) toast.success(message);
    const error = errors[notice];
    if (error) toast.error(error);
    const params = new URLSearchParams(searchParams);
    params.delete("aviso");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [notice, pathname, router, searchParams]);

  return null;
}
