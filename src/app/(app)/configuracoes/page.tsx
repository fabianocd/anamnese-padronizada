import type { Metadata } from "next";
import { Settings } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Configurações" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Configurações"
        description="Perfil, especialidades, senha e conta."
      />
      <EmptyState
        icon={Settings}
        title="Em breve"
        description="Perfil (nome e instituição), especialidades e modelo padrão, alteração de senha e exclusão de conta chegam junto com o login."
      />
    </>
  );
}
