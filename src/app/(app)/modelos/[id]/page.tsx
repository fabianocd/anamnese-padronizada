import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { EditorSkeleton } from "@/components/template-editor/editor-skeleton";
import { TemplateEditor } from "@/components/template-editor/template-editor";
import { listSpecialtyOptions } from "@/lib/data/specialties";
import { getSourceFileLinks, getTemplate } from "@/lib/data/templates";

export const metadata: Metadata = { title: "Editar modelo" };

const TITLE = "Editar modelo";
const DESCRIPTION =
  "Ajuste títulos, siglas, campos e tipos e reordene arrastando. Anamneses já preenchidas só mudam se você atualizá-las.";
const BACK_TO_TEMPLATES = { href: "/modelos", label: "Modelos" };

export default function EditTemplatePage({
  params,
  searchParams,
}: PageProps<"/modelos/[id]">) {
  return (
    <Suspense
      fallback={
        <>
          <PageHeader back={BACK_TO_TEMPLATES} title={TITLE} description={DESCRIPTION} />
          <EditorSkeleton />
        </>
      }
    >
      {Promise.all([params, searchParams]).then(([{ id }, query]) => {
        // Veio de uma anamnese ("Editar modelo"): voltar para ela.
        const anamnesisId = z.uuid().safeParse(query.anamnese);
        const returnTo = anamnesisId.success
          ? { href: `/anamneses/${anamnesisId.data}`, label: "Voltar à anamnese" }
          : undefined;
        return (
          <>
            <PageHeader back={returnTo ?? BACK_TO_TEMPLATES} title={TITLE} description={DESCRIPTION} />
            <EditTemplate id={id} returnTo={returnTo} />
          </>
        );
      })}
    </Suspense>
  );
}

async function EditTemplate({
  id,
  returnTo,
}: {
  id: string;
  returnTo?: { href: string; label: string };
}) {
  if (!z.uuid().safeParse(id).success) notFound();

  const [template, specialties] = await Promise.all([getTemplate(id), listSpecialtyOptions()]);
  if (!template) notFound();

  const sourceLinks = template.sourceFilePath
    ? await getSourceFileLinks(template.sourceFilePath)
    : [];

  return (
    <TemplateEditor
      templateId={template.id}
      initial={{
        title: template.title,
        specialtyId: template.specialtyId,
        isDefault: template.isDefault,
        schema: template.schema,
      }}
      specialties={specialties}
      sourceLinks={sourceLinks}
      returnTo={returnTo?.href}
    />
  );
}
