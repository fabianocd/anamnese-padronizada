import type { Metadata } from "next";
import Link from "next/link";
import { FilePlus2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Nova anamnese" };

export default function NewAnamnesisPage() {
  return (
    <>
      <PageHeader
        title="Nova anamnese"
        description="Escolha um dos seus modelos para começar. O preenchimento é salvo automaticamente."
      />
      <EmptyState
        icon={FilePlus2}
        title="Você ainda não tem modelos"
        description="Para preencher uma anamnese, crie primeiro um modelo a partir de uma ficha."
        action={
          <Button asChild variant="outline" size="lg" className="h-10 rounded-xl px-4">
            <Link href="/modelos/novo">Criar modelo</Link>
          </Button>
        }
      />
    </>
  );
}
