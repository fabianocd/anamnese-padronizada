import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "./breadcrumbs";
import { MobileNav } from "./mobile-nav";

export function Topbar({ userMenu }: { userMenu?: ReactNode }) {
  return (
    <header className="glass-bar sticky top-3 z-30 flex h-16 items-center gap-2 rounded-2xl px-3 sm:px-4">
      <MobileNav footer={userMenu} />
      <div className="min-w-0 flex-1">
        <Suspense fallback={null}>
          <Breadcrumbs />
        </Suspense>
      </div>
      <Button asChild size="lg" className="h-10 rounded-xl px-4">
        <Link href="/anamneses/nova" aria-label="Nova Anamnese">
          <Plus aria-hidden />
          <span className="hidden sm:inline">Nova Anamnese</span>
        </Link>
      </Button>
    </header>
  );
}
