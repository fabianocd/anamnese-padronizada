import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { EditorSkeleton } from "@/components/template-editor/editor-skeleton";
import { listSpecialtyOptions } from "@/lib/data/specialties";
import { DraftReview } from "./draft-review";

export const metadata: Metadata = { title: "Revisar modelo" };

export default function ReviewTemplatePage() {
  return (
    <>
      <PageHeader
        back={{ href: "/modelos/novo", label: "Novo modelo" }}
        title="Revisar modelo"
        description="Ajuste títulos, siglas, campos e tipos, reordene arrastando e salve o modelo na sua conta."
      />
      <Suspense fallback={<EditorSkeleton />}>
        <ReviewEditor />
      </Suspense>
    </>
  );
}

async function ReviewEditor() {
  const specialties = await listSpecialtyOptions();
  return <DraftReview specialties={specialties} />;
}
