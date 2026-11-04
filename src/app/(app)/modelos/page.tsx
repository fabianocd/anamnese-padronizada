import type { Metadata } from "next";
import Link from "next/link";
import { LayoutTemplate, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Modelos" };

export default function TemplatesPage() {
  return (
    <>
      <PageHeader
        title="Modelos"
        description="Fichas de anamnese padronizadas a partir dos seus PDFs ou fotos. Use um modelo para preencher novas anamneses."
        actions={
          <Button asChild size="lg" className="h-10 rounded-xl px-4">
            <Link href="/modelos/novo">
              <Plus aria-hidden />
              Novo modelo
            </Link>
          </Button>
        }
      />
      <EmptyState
        icon={LayoutTemplate}
        title="Nenhum modelo ainda"
        description="Envie o PDF ou fotos de uma ficha de anamnese. A IA monta um rascunho das seções e campos, e você revisa antes de salvar."
        action={
          <Button asChild size="lg" className="h-10 rounded-xl px-4">
            <Link href="/modelos/novo">
              <Plus aria-hidden />
              Criar primeiro modelo
            </Link>
          </Button>
        }
      />
    </>
  );
}
