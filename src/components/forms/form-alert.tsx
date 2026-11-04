import { CircleAlert, CircleCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type FormAlertProps = {
  tone: "error" | "success";
  children: React.ReactNode;
  className?: string;
};

/** Mensagem de erro/sucesso de um formulário (anunciada por leitores de tela). */
export function FormAlert({ tone, children, className }: FormAlertProps) {
  const Icon = tone === "error" ? CircleAlert : CircleCheck;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-sm",
        tone === "error"
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-primary/30 bg-primary/10 text-foreground",
        className,
      )}
    >
      <Icon
        className={cn("mt-0.5 size-4 shrink-0", tone === "success" && "text-primary")}
        aria-hidden
      />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
