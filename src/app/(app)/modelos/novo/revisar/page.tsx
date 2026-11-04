import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { DraftReview } from "./draft-review";

export const metadata: Metadata = { title: "Revisar modelo" };

export default function ReviewTemplatePage() {
  return (
    <>
      <PageHeader
        title="Revisar modelo"
        description="Confira as seções e campos do rascunho antes de salvar o modelo na sua conta."
      />
      <DraftReview />
    </>
  );
}
