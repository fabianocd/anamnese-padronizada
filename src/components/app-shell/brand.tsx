import Link from "next/link";
import { ClipboardList } from "lucide-react";

export function Brand() {
  return (
    <Link
      href="/modelos"
      className="flex items-center gap-3 rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[0_6px_20px_-6px_var(--primary)]">
        <ClipboardList className="size-5" aria-hidden />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="font-heading text-base font-semibold tracking-tight">
          Anamnese
        </span>
        <span className="text-xs text-muted-foreground">Padronizada</span>
      </span>
    </Link>
  );
}
