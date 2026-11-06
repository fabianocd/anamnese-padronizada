import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { z } from "zod";
import { NoteEditor } from "@/components/note-editor/note-editor";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getNote } from "@/lib/data/notes";

export const metadata: Metadata = { title: "Nota" };

export default function NotePage({ params }: PageProps<"/notas/[id]">) {
  return (
    <>
      <PageHeader back={{ href: "/notas", label: "Bloco de Notas" }} title="Nota" />
      <Suspense fallback={<Skeleton className="h-[28rem] rounded-3xl" aria-busy />}>
        {params.then(({ id }) => (
          <NoteLoader id={id} />
        ))}
      </Suspense>
    </>
  );
}

async function NoteLoader({ id }: { id: string }) {
  if (!z.uuid().safeParse(id).success) notFound();
  const note = await getNote(id);
  if (!note) notFound();

  return (
    <NoteEditor
      key={note.id}
      id={note.id}
      initial={{ title: note.title, content: note.content }}
      updatedAt={note.updatedAt}
    />
  );
}
