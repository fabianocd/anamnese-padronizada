import Link from "next/link";
import { ProntusMark } from "./prontus-mark";

export function Brand() {
  return (
    <Link
      href="/modelos"
      className="flex items-center gap-2.5 rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <ProntusMark className="size-10 shrink-0" />
      <span className="flex flex-col leading-tight">
        <span className="bg-linear-to-r from-(--logo-from) to-(--logo-to) bg-clip-text font-heading text-lg font-semibold tracking-tight text-transparent">
          Prontus
        </span>
        <span className="text-xs text-muted-foreground">
          Anamnese padronizada
        </span>
      </span>
    </Link>
  );
}
