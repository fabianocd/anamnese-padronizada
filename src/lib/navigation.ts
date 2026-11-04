import {
  FilePlus2,
  History,
  LayoutTemplate,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const mainNav: NavItem[] = [
  { href: "/modelos", label: "Modelos", icon: LayoutTemplate },
  { href: "/anamneses/nova", label: "Nova anamnese", icon: FilePlus2 },
  { href: "/historico", label: "Histórico", icon: History },
];

export const secondaryNav: NavItem[] = [
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Nome de cada segmento de rota exibido no breadcrumb. */
const segmentLabels: Record<string, string> = {
  modelos: "Modelos",
  novo: "Novo modelo",
  anamneses: "Anamneses",
  nova: "Nova anamnese",
  historico: "Histórico",
  configuracoes: "Configurações",
  editar: "Editar",
  revisar: "Revisão",
};

export type Crumb = { label: string; href: string };

export function getBreadcrumbs(pathname: string): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: Crumb[] = [];

  segments.forEach((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join("/")}`;
    // "/anamneses" não tem página própria; o item vira "Histórico".
    if (segment === "anamneses" && segments.length > 1) {
      if (segments[1] !== "nova") {
        crumbs.push({ label: "Histórico", href: "/historico" });
      }
      return;
    }
    crumbs.push({ label: segmentLabels[segment] ?? "Detalhes", href });
  });

  return crumbs;
}
