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

export default function EditTemplatePage({ params }: PageProps<"/modelos/[id]">) {
  return (
    <>
      <PageHeader
        back={{ href: "/modelos", label: "Modelos" }}
        title="Editar modelo"
        description="Ajuste títulos, siglas, campos e tipos e reordene arrastando. Anamneses já preenchidas não mudam."
      />
      <Suspense fallback={<EditorSkeleton />}>
        {params.then(({ id }) => (
          <EditTemplate id={id} />
        ))}
      </Suspense>
    </>
  );
}

async function EditTemplate({ id }: { id: string }) {
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
    />
  );
}
