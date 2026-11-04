"use client";

import {
  memo,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  ClipboardCopy,
  CloudUpload,
  Copy,
  EllipsisVertical,
  Eye,
  FileDown,
  History,
  LoaderCircle,
  Save,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  deleteAnamnesis,
  duplicateAnamnesis,
  saveAnamnesis,
} from "@/app/(app)/anamneses/actions";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ANSWER_LIMITS,
  anamnesisMetaSchema,
  countAnswered,
  isAnswered,
  type Answers,
  type AnswerValue,
} from "@/lib/anamneses/answers";
import { sectionHeading } from "@/lib/templates/format";
import type { EditableSection, EditableTemplate } from "@/lib/templates/schema";
import { ExportSheet } from "@/components/anamnesis-export/export-sheet";
import { preloadPdf } from "@/components/anamnesis-export/export-actions";
import { useAnamnesisExport } from "@/components/anamnesis-export/use-anamnesis-export";
import { buildAnamnesisExport } from "@/lib/anamneses/export";
import { FieldInput } from "./field-input";

type AnamnesisFormProps = {
  id: string;
  initial: { title: string; patientLabel: string; answers: Answers };
  snapshot: EditableTemplate;
  templateTitle: string | null;
  templateDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  /** Nome e instituição do perfil, para o cabeçalho do PDF. */
  author: { fullName: string | null; institution: string | null };
};

type SaveStatus = "saved" | "pending" | "saving" | "error" | "invalid";

const AUTOSAVE_DELAY = 1000;

const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});
const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

export function AnamnesisForm({
  id,
  initial,
  snapshot,
  templateTitle,
  templateDeleted,
  createdAt,
  updatedAt,
  author,
}: AnamnesisFormProps) {
  const router = useRouter();
  const titleId = useId();
  const patientId = useId();

  const [title, setTitle] = useState(initial.title);
  const [patientLabel, setPatientLabel] = useState(initial.patientLabel);
  const [answers, setAnswers] = useState<Answers>(initial.answers);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState(updatedAt);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const exporter = useAnamnesisExport();
  const [busy, startBusy] = useTransition();
  const [saving, startSaving] = useTransition();

  // Controle do salvamento automático fora do ciclo de render.
  const latest = useRef({ title, patientLabel, answers });
  const version = useRef(0);
  const savedVersion = useRef(0);
  const running = useRef<Promise<void> | null>(null);

  useEffect(() => {
    latest.current = { title, patientLabel, answers };
  }, [title, patientLabel, answers]);

  const markChanged = useCallback(() => {
    version.current += 1;
    setStatus("pending");
  }, []);

  /**
   * Salva até não sobrar alteração (o que mudar durante um envio vai no
   * próximo). Se já houver um envio em andamento, devolve o mesmo.
   */
  const flush = useCallback((): Promise<void> => {
    if (running.current) return running.current;

    const run = async () => {
      while (version.current !== savedVersion.current) {
        const target = version.current;
        const payload = latest.current;
        const meta = anamnesisMetaSchema.safeParse(payload);
        if (!meta.success) {
          setStatus("invalid");
          setErrorMessage(meta.error.issues[0]?.message ?? "Confira o título e a identificação.");
          return;
        }

        setStatus("saving");
        try {
          const result = await saveAnamnesis({ id, ...meta.data, answers: payload.answers });
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
          setErrorMessage("Sem conexão. As respostas continuam aqui; tente de novo.");
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

  /** Botão "Salvar": salva na hora e confirma. */
  function saveNow() {
    startSaving(async () => {
      await flush();
      if (version.current === savedVersion.current) toast.success("Anamnese salva.");
      else toast.error("Não foi possível salvar. Confira o aviso na barra abaixo.");
    });
  }

  // Salva um pouco depois da última alteração.
  useEffect(() => {
    if (version.current === savedVersion.current) return;
    const timer = window.setTimeout(() => void flush(), AUTOSAVE_DELAY);
    return () => window.clearTimeout(timer);
  }, [title, patientLabel, answers, flush]);

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

  const onAnswer = useCallback(
    (fieldId: string, value: AnswerValue) => {
      setAnswers((previous) => ({ ...previous, [fieldId]: value }));
      markChanged();
    },
    [markChanged],
  );

  const progress = useMemo(() => countAnswered(snapshot, answers), [snapshot, answers]);

  // Exporta o que está na tela (inclusive o que ainda não foi salvo).
  const buildExport = useCallback(
    () =>
      buildAnamnesisExport({ title, patientLabel, createdAt, snapshot, answers, author }),
    [title, patientLabel, createdAt, snapshot, answers, author],
  );
  const previewDocument = useMemo(
    () => (previewOpen ? buildExport() : null),
    [previewOpen, buildExport],
  );

  function duplicate() {
    startBusy(async () => {
      await flush();
      const result = await duplicateAnamnesis(id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Cópia criada. Você está editando a cópia.");
      router.push(`/anamneses/${result.id}`);
    });
  }

  function remove() {
    startBusy(async () => {
      const result = await deleteAnamnesis(id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      // Nada mais a salvar.
      savedVersion.current = version.current;
      router.push("/historico?aviso=anamnese-excluida");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="glass flex flex-col gap-4 rounded-3xl p-4 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,16rem)]">
          <div className="flex flex-col gap-2">
            <Label htmlFor={titleId}>Título</Label>
            <Input
              id={titleId}
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                markChanged();
              }}
              maxLength={ANSWER_LIMITS.title}
              aria-invalid={(status === "invalid" && !title.trim()) || undefined}
              className="h-11 rounded-xl px-3 font-heading text-lg font-semibold md:text-lg"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={patientId}>Paciente (iniciais ou código)</Label>
            <Input
              id={patientId}
              value={patientLabel}
              onChange={(event) => {
                setPatientLabel(event.target.value);
                markChanged();
              }}
              placeholder="Ex.: M.S. ou leito 4"
              maxLength={ANSWER_LIMITS.patientLabel}
              autoComplete="off"
              className="h-11 rounded-xl px-3"
            />
          </div>
        </div>

        <div className="flex items-start gap-2.5 rounded-xl border border-border bg-background/40 px-3 py-2.5 text-sm text-muted-foreground">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <p>
            Dados de saúde são sensíveis: identifique o paciente só por iniciais ou código. Não
            registre nome completo, CPF, endereço ou telefone.
          </p>
        </div>

        <p className="text-sm text-muted-foreground">
          {templateDeleted
            ? "Modelo de origem excluído"
            : `Modelo: ${templateTitle ?? "—"}`}{" "}
          · criada em {dateFormatter.format(new Date(createdAt))}. Mudanças no modelo depois não
          alteram esta anamnese.
        </p>
      </section>

      <ol className="flex flex-col gap-3">
        {snapshot.sections.map((section) => (
          <SectionFields
            key={section.id}
            section={section}
            answers={answers}
            onAnswer={onAnswer}
          />
        ))}
      </ol>

      <div className="glass-bar sticky bottom-3 z-30 flex flex-col gap-3 rounded-2xl p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 px-1 text-sm">
          <SaveIndicator
            status={status}
            lastSavedAt={lastSavedAt}
            errorMessage={errorMessage}
            onRetry={() => void flush()}
          />
          <span className="text-muted-foreground">
            {progress.answered} de {progress.total} campos preenchidos
          </span>
        </div>
        <div className="flex justify-end gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="lg"
                className="h-10 rounded-xl px-3"
                disabled={busy || exporter.downloading}
                aria-label="Mais ações"
              >
                {busy || exporter.downloading ? (
                  <LoaderCircle className="animate-spin" aria-hidden />
                ) : (
                  <EllipsisVertical aria-hidden />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onSelect={() => void exporter.download(buildExport())}>
                <FileDown aria-hidden />
                Baixar PDF
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void exporter.copy(buildExport())}>
                <ClipboardCopy aria-hidden />
                Copiar texto
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={duplicate}>
                <Copy aria-hidden />
                Duplicar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
                <Trash2 aria-hidden />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-10 rounded-xl px-3 sm:px-4"
          >
            <Link href="/historico" aria-label="Histórico">
              <History aria-hidden />
              <span className="hidden sm:inline">Histórico</span>
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-10 rounded-xl px-4"
            onClick={() => setPreviewOpen(true)}
            onPointerEnter={preloadPdf}
            onFocus={preloadPdf}
          >
            <Eye aria-hidden />
            Prévia
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

      {previewDocument ? (
        <ExportSheet
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          document={previewDocument}
        />
      ) : null}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta anamnese?</AlertDialogTitle>
            <AlertDialogDescription>
              As respostas serão apagadas de forma permanente. Não dá para desfazer.
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

const SectionFields = memo(function SectionFields({
  section,
  answers,
  onAnswer,
}: {
  section: EditableSection;
  answers: Answers;
  onAnswer: (fieldId: string, value: AnswerValue) => void;
}) {
  const answered = section.fields.filter((field) => isAnswered(answers[field.id])).length;

  return (
    <li className="glass rounded-2xl p-4 pb-1 sm:p-5 sm:pb-2">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="font-heading text-base font-semibold tracking-tight">
          {sectionHeading(section)}
        </h2>
        {section.abbreviation ? (
          <span className="text-sm text-muted-foreground">{section.title}</span>
        ) : null}
        <span className="ml-auto text-xs text-muted-foreground">
          {answered}/{section.fields.length}
        </span>
      </div>
      {/* gap-y pequeno: o espaço entre campos vem do pb dos próprios campos (subgrid). */}
      <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
        {section.fields.map((field) => (
          <FieldInput
            key={field.id}
            field={field}
            value={answers[field.id]}
            onChange={onAnswer}
          />
        ))}
      </div>
    </li>
  );
});

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
