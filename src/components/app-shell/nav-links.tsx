"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { isActive, mainNav, secondaryNav, type NavItem } from "@/lib/navigation";

export type NavGroup = "main" | "secondary";

// Os itens têm ícones (componentes), que não podem ser passados do servidor
// para o client como props; por isso o grupo é escolhido por nome.
const groups: Record<NavGroup, NavItem[]> = { main: mainNav, secondary: secondaryNav };

type NavLinksProps = {
  group: NavGroup;
  onNavigate?: () => void;
};

/** Lista de links com destaque no item ativo (lê a URL, por isso é client). */
export function NavLinks({ group, onNavigate }: NavLinksProps) {
  const pathname = usePathname();
  return <NavList items={groups[group]} pathname={pathname} onNavigate={onNavigate} />;
}

/** Mesma lista sem item ativo, usada como fallback do Suspense. */
export function NavLinksFallback({ group }: { group: NavGroup }) {
  return <NavList items={groups[group]} pathname="" />;
}

function NavList({
  items,
  pathname,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <ul className="flex flex-col gap-1">
      {items.map((item) => {
        const active = pathname !== "" && isActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                active
                  ? "bg-primary text-primary-foreground shadow-[0_8px_24px_-10px_var(--primary)]"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
