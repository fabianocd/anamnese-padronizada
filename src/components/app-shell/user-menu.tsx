import { LogOut } from "lucide-react";
import { signOut } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getProfile } from "@/lib/data/profile";

function initialsOf(name: string | null, email: string) {
  const source = name?.trim() || email;
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

/** Identificação da pessoa logada + botão Sair (lê a sessão: usar em <Suspense>). */
export async function UserMenu() {
  const profile = await getProfile();
  const displayName = profile.fullName || profile.email;

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/30 p-2.5">
      <span
        className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-xs font-semibold text-secondary-foreground"
        aria-hidden
      >
        {initialsOf(profile.fullName, profile.email)}
      </span>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-sm font-medium">{displayName}</p>
        {profile.fullName ? (
          <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
        ) : null}
      </div>
      <form action={signOut}>
        <Button type="submit" variant="ghost" size="icon" aria-label="Sair" title="Sair">
          <LogOut aria-hidden />
        </Button>
      </form>
    </div>
  );
}

export function UserMenuFallback() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/30 p-2.5">
      <Skeleton className="size-9 rounded-xl" />
      <div className="flex flex-1 flex-col gap-1.5">
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}
