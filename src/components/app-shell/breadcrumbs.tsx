"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getBreadcrumbs } from "@/lib/navigation";

export function Breadcrumbs() {
  const pathname = usePathname();
  const crumbs = getBreadcrumbs(pathname);

  return (
    <nav aria-label="Trilha de navegação" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          return (
            <li
              key={crumb.href}
              className={
                last
                  ? "flex min-w-0 items-center gap-1.5"
                  : "hidden min-w-0 items-center gap-1.5 sm:flex"
              }
            >
              {last ? (
                <span aria-current="page" className="truncate text-foreground">
                  {crumb.label}
                </span>
              ) : (
                <>
                  <Link
                    href={crumb.href}
                    className="truncate transition-colors hover:text-foreground"
                  >
                    {crumb.label}
                  </Link>
                  <ChevronRight className="size-3.5 shrink-0" aria-hidden />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
