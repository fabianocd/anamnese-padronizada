import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl items-center p-4">
      <EmptyState
        className="w-full"
        icon={SearchX}
        title="Página não encontrada"
        description="O endereço pode estar errado ou a página foi removida."
        action={
          <Button asChild size="lg" className="h-10 rounded-xl px-4">
            <Link href="/modelos">Voltar ao início</Link>
          </Button>
        }
      />
    </main>
  );
}
