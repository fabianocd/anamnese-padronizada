"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

const messages: Record<string, string> = {
  "senha-alterada": "Senha alterada com sucesso.",
  "conta-confirmada": "E-mail confirmado. Bem-vindo(a)!",
  "modelo-criado": "Modelo salvo na sua conta.",
  "modelo-excluido": "Modelo excluído.",
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
    const params = new URLSearchParams(searchParams);
    params.delete("aviso");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [notice, pathname, router, searchParams]);

  return null;
}
