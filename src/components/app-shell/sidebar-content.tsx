import { Suspense, type ReactNode } from "react";
import { Brand } from "./brand";
import { NavLinks, NavLinksFallback } from "./nav-links";

type SidebarContentProps = {
  onNavigate?: () => void;
  /** Rodapé (menu do usuário), renderizado no servidor e passado como slot. */
  footer?: ReactNode;
};

/** Conteúdo da sidebar, compartilhado entre desktop e menu do celular. */
export function SidebarContent({ onNavigate, footer }: SidebarContentProps) {
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <Brand />

      <nav aria-label="Principal" className="flex flex-1 flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="px-3 text-[0.7rem] font-semibold tracking-wider text-muted-foreground uppercase">
            Anamneses
          </p>
          <Suspense fallback={<NavLinksFallback group="main" />}>
            <NavLinks group="main" onNavigate={onNavigate} />
          </Suspense>
        </div>

        <div className="mt-auto">
          <Suspense fallback={<NavLinksFallback group="secondary" />}>
            <NavLinks group="secondary" onNavigate={onNavigate} />
          </Suspense>
        </div>
      </nav>

      {footer}
    </div>
  );
}
