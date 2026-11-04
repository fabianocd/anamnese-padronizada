import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { z } from "zod";
import { AnamnesisForm } from "@/components/anamnesis-form/anamnesis-form";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getAnamnesis } from "@/lib/data/anamneses";
import { getProfile } from "@/lib/data/profile";

export const metadata: Metadata = { title: "Anamnese" };

export default function AnamnesisPage({ params }: PageProps<"/anamneses/[id]">) {
  return (
    <>
      <PageHeader
        title="Anamnese"
        description="Preencha normalmente; tudo é salvo automaticamente. Em “Prévia” você vê como fica o PDF e copia o texto formatado."
      />
      <Suspense fallback={<FormSkeleton />}>
        {params.then(({ id }) => (
          <AnamnesisLoader id={id} />
        ))}
      </Suspense>
    </>
  );
}

async function AnamnesisLoader({ id }: { id: string }) {
  if (!z.uuid().safeParse(id).success) notFound();
  const [anamnesis, profile] = await Promise.all([getAnamnesis(id), getProfile()]);
  if (!anamnesis) notFound();

  return (
    <AnamnesisForm
      // Outra anamnese (ex.: depois de duplicar) começa com estado novo.
      key={anamnesis.id}
      id={anamnesis.id}
      initial={{
        title: anamnesis.title,
        patientLabel: anamnesis.patientLabel,
        answers: anamnesis.answers,
      }}
      snapshot={anamnesis.snapshot}
      templateTitle={anamnesis.templateTitle}
      templateDeleted={anamnesis.templateId === null}
      createdAt={anamnesis.createdAt}
      updatedAt={anamnesis.updatedAt}
      author={{ fullName: profile.fullName, institution: profile.institution }}
    />
  );
}

function FormSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy>
      <Skeleton className="h-52 rounded-3xl" />
      <Skeleton className="h-64 rounded-3xl" />
      <Skeleton className="h-64 rounded-3xl" />
    </div>
  );
}
