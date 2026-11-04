import type { Metadata } from "next";
import { FileUp } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Novo modelo" };

export default function NewTemplatePage() {
  return (
    <>
      <PageHeader
        title="Novo modelo"
        description="Envie 1 PDF ou até 10 fotos da ficha em branco (máx. 20 MB). Nunca envie fichas preenchidas com dados de pacientes."
      />
      <EmptyState
        icon={FileUp}
        title="Envio de arquivo em breve"
        description="O upload e a leitura da ficha pela IA chegam na fase 3. Também será possível criar o modelo manualmente."
      />
    </>
  );
}
