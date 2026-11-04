import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "glass flex flex-col items-center rounded-3xl px-6 py-14 text-center sm:py-20",
        className,
      )}
    >
      <span className="mb-5 grid size-14 place-items-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
        <Icon className="size-6" aria-hidden />
      </span>
      <h2 className="font-heading text-xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-6 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}
