import {
  FilePlus2,
  History,
  LayoutTemplate,
  NotebookPen,
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
  { href: "/anamneses/nova", label: "Nova Anamnese", icon: FilePlus2 },
  { href: "/historico", label: "Histórico", icon: History },
  { href: "/notas", label: "Bloco de Notas", icon: NotebookPen },
];

export const secondaryNav: NavItem[] = [
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
