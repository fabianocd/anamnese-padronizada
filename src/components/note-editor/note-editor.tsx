"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  CloudUpload,
  LoaderCircle,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { deleteNote, saveNote } from "@/app/(app)/notas/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { NOTE_LIMITS, UNTITLED_NOTE, saveNoteInputSchema } from "@/lib/notes/schema";

type NoteEditorProps = {
  id: string;
  initial: { title: string; content: string };
  updatedAt: string;
};

type SaveStatus = "saved" | "pending" | "saving" | "error" | "invalid";

const AUTOSAVE_DELAY = 1000;

const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

export function NoteEditor({ id, initial, updatedAt }: NoteEditorProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [content, setContent] = useState(initial.content);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState(updatedAt);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, startDeleting] = useTransition();
  const [saving, startSaving] = useTransition();

  // Controle do salvamento automático fora do ciclo de render.
  const latest = useRef({ title, content });
  const version = useRef(0);
  const savedVersion = useRef(0);
  const running = useRef<Promise<void> | null>(null);

  useEffect(() => {
    latest.current = { title, content };
  }, [title, content]);

  function markChanged() {
    version.current += 1;
    setStatus("pending");
  }

  /** Salva até não sobrar alteração; se já houver envio em andamento, devolve o mesmo. */
  const flush = useCallback((): Promise<void> => {
    if (running.current) return running.current;

    const run = async () => {
      while (version.current !== savedVersion.current) {
        const target = version.current;
        const input = saveNoteInputSchema.safeParse({ id, ...latest.current });
        if (!input.success) {
          setStatus("invalid");
          setErrorMessage(input.error.issues[0]?.message ?? "Confira o título e o texto.");
          return;
        }

        setStatus("saving");
        try {
          const result = await saveNote(input.data);
          if (!result.ok) {
            setStatus("error");
            setErrorMessage(result.message);
            return;
          }
          savedVersion.current = target;
          setLastSavedAt(result.updatedAt);
          setErrorMessage(null);
        } catch {
          setStatus("error");
          setErrorMessage("Sem conexão. O texto continua aqui; tente de novo.");
          return;
        }
      }
      setStatus("saved");
    };

    const promise = run().finally(() => {
      running.current = null;
    });
    running.current = promise;
    return promise;
  }, [id]);

  function saveNow() {
    startSaving(async () => {
      await flush();
      if (version.current === savedVersion.current) toast.success("Nota salva.");
      else toast.error("Não foi possível salvar. Confira o aviso abaixo.");
    });
  }

  // Salva um pouco depois da última alteração.
  useEffect(() => {
    if (version.current === savedVersion.current) return;
    const timer = window.setTimeout(() => void flush(), AUTOSAVE_DELAY);
    return () => window.clearTimeout(timer);
  }, [title, content, flush]);

  // Ao esconder a aba ou sair da página, salva na hora; avisa se ainda há pendências.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (version.current !== savedVersion.current) {
        void flush();
        event.preventDefault();
      }
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("beforeunload", onBeforeUnload);
      void flush();
    };
  }, [flush]);

  function remove() {
    startDeleting(async () => {
      const result = await deleteNote(id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      // Nada mais a salvar.
      savedVersion.current = version.current;
      router.push("/notas?aviso=nota-excluida");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="glass flex flex-col gap-3 rounded-3xl p-4 sm:p-6">
        <input
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            markChanged();
          }}
          placeholder={UNTITLED_NOTE}
          maxLength={NOTE_LIMITS.title}
          aria-label="Título da nota"
          autoComplete="off"
          className="w-full rounded-lg bg-transparent px-1 py-1 font-heading text-2xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground/60 focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <textarea
          value={content}
          onChange={(event) => {
            setContent(event.target.value);
            markChanged();
          }}
          placeholder="Escreva aqui…"
          maxLength={NOTE_LIMITS.content}
          aria-label="Texto da nota"
          className="field-sizing-content min-h-[50vh] w-full resize-none rounded-lg bg-transparent px-1 py-1 text-base leading-relaxed outline-none placeholder:text-muted-foreground/60 focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </section>

      <div className="glass-bar sticky bottom-3 z-30 flex flex-col gap-3 rounded-2xl p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 px-1 text-sm">
          <SaveIndicator
            status={status}
            lastSavedAt={lastSavedAt}
            errorMessage={errorMessage}
            onRetry={() => void flush()}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="h-10 rounded-xl px-3 text-muted-foreground hover:text-destructive"
            onClick={() => setConfirmDelete(true)}
            disabled={deleting}
          >
            {deleting ? (
              <LoaderCircle className="animate-spin" aria-hidden />
            ) : (
              <Trash2 aria-hidden />
            )}
            Excluir
          </Button>
          <Button
            type="button"
            size="lg"
            className="h-10 min-w-28 rounded-xl px-4"
            onClick={saveNow}
            disabled={saving || status === "saved"}
            aria-busy={saving || undefined}
          >
            {saving || status === "saving" ? (
              <LoaderCircle className="animate-spin" aria-hidden />
            ) : status === "saved" ? (
              <Check aria-hidden />
            ) : (
              <Save aria-hidden />
            )}
            {status === "saved" ? "Salvo" : "Salvar"}
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta nota?</AlertDialogTitle>
            <AlertDialogDescription>
              O texto será apagado de forma permanente. Não dá para desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={remove}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SaveIndicator({
  status,
  lastSavedAt,
  errorMessage,
  onRetry,
}: {
  status: SaveStatus;
  lastSavedAt: string;
  errorMessage: string | null;
  onRetry: () => void;
}) {
  if (status === "error" || status === "invalid") {
    return (
      <span className="flex items-center gap-1.5 font-medium text-destructive" role="alert">
        <AlertCircle className="size-4" aria-hidden />
        {errorMessage ?? "Não foi possível salvar."}
        {status === "error" ? (
          <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={onRetry}>
            Tentar de novo
          </Button>
        ) : null}
      </span>
    );
  }
  if (status === "saving" || status === "pending") {
    return (
      <span className="flex items-center gap-1.5 text-muted-foreground" aria-live="polite">
        {status === "saving" ? (
          <LoaderCircle className="size-4 animate-spin" aria-hidden />
        ) : (
          <CloudUpload className="size-4" aria-hidden />
        )}
        {status === "saving" ? "Salvando…" : "Alterações a salvar"}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-muted-foreground" aria-live="polite">
      <Check className="size-4 text-primary" aria-hidden />
      Salvo às {timeFormatter.format(new Date(lastSavedAt))}
    </span>
  );
}
