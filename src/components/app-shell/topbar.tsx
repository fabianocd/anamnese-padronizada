import type { ReactNode } from "react";
import { Brand } from "./brand";
import { MobileNav } from "./mobile-nav";

/** Barra do topo só no celular/tablet: menu e marca (no desktop a sidebar faz esse papel). */
export function Topbar({ userMenu }: { userMenu?: ReactNode }) {
  return (
    <header className="glass-bar sticky top-3 z-30 flex h-16 items-center gap-2 rounded-2xl px-3 lg:hidden">
      <MobileNav footer={userMenu} />
      <Brand />
    </header>
  );
}
