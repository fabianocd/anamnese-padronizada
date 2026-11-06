import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { NotebookPen } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { listNotes, type NoteSummary } from "@/lib/data/notes";
import { UNTITLED_NOTE } from "@/lib/notes/schema";
import { cn } from "@/lib/utils";
import { createNote } from "./actions";
import { NewNoteButton } from "./new-note-button";
import { NoteActions } from "./note-actions";

export const metadata: Metadata = { title: "Bloco de Notas" };

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

export default function NotesPage() {
  return (
    <>
      <PageHeader
        title="Bloco de Notas"
        description="Anotações livres, salvas na sua conta. Não registre dados que identifiquem pacientes."
        actions={
          <form action={createNote}>
            <NewNoteButton />
          </form>
        }
      />
      <Suspense fallback={<NotesSkeleton />}>
        <NotesList />
      </Suspense>
    </>
  );
}

async function NotesList() {
  const notes = await listNotes();

  if (notes.length === 0) {
    return (
      <EmptyState
        icon={NotebookPen}
        title="Nenhuma nota ainda"
        description="Crie uma nota para guardar lembretes, roteiros de estudo ou o que precisar."
        action={
          <form action={createNote}>
            <NewNoteButton />
          </form>
        }
      />
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {notes.map((note) => (
        <NoteCard key={note.id} note={note} />
      ))}
    </ul>
  );
}

function NoteCard({ note }: { note: NoteSummary }) {
  const title = note.title || UNTITLED_NOTE;
  return (
    <li className="glass relative flex min-h-36 flex-col gap-2 rounded-2xl p-4 transition-shadow hover:shadow-lg">
      <div className="flex items-start gap-2">
        <h2
          className={cn(
            "min-w-0 flex-1 truncate pt-1.5 font-heading text-base font-semibold tracking-tight",
            !note.title && "text-muted-foreground",
          )}
        >
          {/* O link cobre o card inteiro; o menu de ações fica por cima. */}
          <Link
            href={`/notas/${note.id}`}
            className="outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
          >
            {title}
          </Link>
        </h2>
        <div className="relative z-10 -mt-0.5 -mr-1">
          <NoteActions id={note.id} title={title} />
        </div>
      </div>
      <p className="line-clamp-3 flex-1 text-sm break-words text-muted-foreground">
        {note.excerpt || "Nota em branco"}
      </p>
      <p className="text-xs text-muted-foreground">
        Atualizada em {dateTimeFormatter.format(new Date(note.updatedAt))}
      </p>
    </li>
  );
}

function NotesSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-busy>
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} className="h-36 rounded-2xl" />
      ))}
    </div>
  );
}
