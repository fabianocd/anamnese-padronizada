import type { Metadata } from "next";
import { Palette, UserRound } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ThemeSelector } from "@/components/theme-selector";

export const metadata: Metadata = { title: "Configurações" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Configurações"
        description="Aparência, perfil, especialidades, senha e conta."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="glass rounded-3xl p-5 sm:p-6">
          <SectionTitle icon={Palette} title="Aparência" />
          <p className="mt-1 mb-4 text-sm text-muted-foreground">
            Escolha o tema. &quot;Sistema&quot; acompanha o tema do seu
            dispositivo. A escolha fica salva neste navegador.
          </p>
          <ThemeSelector />
        </section>

        <section className="glass rounded-3xl p-5 sm:p-6">
          <SectionTitle icon={UserRound} title="Perfil e conta" />
          <p className="mt-1 text-sm text-muted-foreground">
            Perfil (nome e instituição), especialidades e modelo padrão,
            alteração de senha e exclusão de conta chegam junto com o login.
          </p>
        </section>
      </div>
    </>
  );
}

function SectionTitle({
  icon: Icon,
  title,
}: {
  icon: typeof Palette;
  title: string;
}) {
  return (
    <h2 className="flex items-center gap-2 font-heading text-lg font-semibold tracking-tight">
      <Icon className="size-5 text-primary" aria-hidden />
      {title}
    </h2>
  );
}
