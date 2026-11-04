import type { Metadata } from "next";
import { History } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Histórico" };

export default function HistoryPage() {
  return (
    <>
      <PageHeader
        title="Histórico"
        description="Anamneses preenchidas. Busque, filtre por modelo, abra, duplique ou exporte em PDF."
      />
      <EmptyState
        icon={History}
        title="Nenhuma anamnese preenchida"
        description="As anamneses que você preencher aparecem aqui."
      />
    </>
  );
}
