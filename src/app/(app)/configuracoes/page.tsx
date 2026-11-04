import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { KeyRound, Palette, Stethoscope, Trash2, UserRound } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ThemeSelector } from "@/components/theme-selector";
import { Skeleton } from "@/components/ui/skeleton";
import { getProfile } from "@/lib/data/profile";
import { listSpecialties } from "@/lib/data/specialties";
import { cn } from "@/lib/utils";
import { DeleteAccountForm } from "./delete-account-form";
import { PasswordForm } from "./password-form";
import { ProfileForm } from "./profile-form";
import { SpecialtiesManager } from "./specialties-manager";

export const metadata: Metadata = { title: "Configurações" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Configurações"
        description="Aparência, perfil, especialidades, senha e conta."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <SettingsCard
          icon={<UserRound className="size-5 text-primary" aria-hidden />}
          title="Perfil"
          description="Seu nome e instituição."
        >
          <Suspense fallback={<FormSkeleton fields={3} />}>
            <ProfileSection />
          </Suspense>
        </SettingsCard>

        <SettingsCard
          icon={<Palette className="size-5 text-primary" aria-hidden />}
          title="Aparência"
          description='Escolha o tema. "Sistema" acompanha o tema do seu dispositivo. A escolha fica salva neste navegador.'
        >
          <ThemeSelector />
        </SettingsCard>

        <SettingsCard
          icon={<Stethoscope className="size-5 text-primary" aria-hidden />}
          title="Especialidades"
          description="Sua lista para organizar os modelos. O modelo padrão de cada especialidade é escolhido no editor de modelos."
        >
          <Suspense fallback={<FormSkeleton fields={1} />}>
            <SpecialtiesSection />
          </Suspense>
        </SettingsCard>

        <SettingsCard
          icon={<KeyRound className="size-5 text-primary" aria-hidden />}
          title="Senha"
          description="Para trocar, confirme a senha atual."
        >
          <PasswordForm />
        </SettingsCard>

        <SettingsCard
          icon={<Trash2 className="size-5 text-destructive" aria-hidden />}
          title="Excluir conta"
          description="Apaga de forma permanente sua conta, modelos, anamneses e arquivos enviados. Não dá para desfazer."
          className="border-destructive/30 lg:col-span-2"
        >
          <div className="max-w-md">
            <DeleteAccountForm />
          </div>
        </SettingsCard>
      </div>
    </>
  );
}

async function ProfileSection() {
  const profile = await getProfile();
  return (
    <ProfileForm
      email={profile.email}
      fullName={profile.fullName}
      institution={profile.institution}
    />
  );
}

async function SpecialtiesSection() {
  const specialties = await listSpecialties();
  return <SpecialtiesManager specialties={specialties} />;
}

function SettingsCard({
  icon,
  title,
  description,
  className,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("glass rounded-3xl p-5 sm:p-6", className)}>
      <h2 className="flex items-center gap-2 font-heading text-lg font-semibold tracking-tight">
        {icon}
        {title}
      </h2>
      <p className="mt-1 mb-5 text-sm text-muted-foreground">{description}</p>
      {children}
    </section>
  );
}

function FormSkeleton({ fields }: { fields: number }) {
  return (
    <div className="flex flex-col gap-4" aria-hidden>
      {Array.from({ length: fields }, (_, index) => (
        <div key={index} className="flex flex-col gap-2">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}
