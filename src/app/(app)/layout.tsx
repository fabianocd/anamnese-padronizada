import { Suspense } from "react";
import { FlashToast } from "@/components/app-shell/flash-toast";
import { SidebarContent } from "@/components/app-shell/sidebar-content";
import { Topbar } from "@/components/app-shell/topbar";
import { UserMenu, UserMenuFallback } from "@/components/app-shell/user-menu";

export default function AppLayout({ children }: LayoutProps<"/">) {
  // Lê a sessão, então fica atrás de <Suspense> para não travar a página.
  const userMenu = (
    <Suspense fallback={<UserMenuFallback />}>
      <UserMenu />
    </Suspense>
  );

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[1600px] gap-3 p-3">
      <aside className="glass sticky top-3 hidden h-[calc(100dvh-1.5rem)] w-64 shrink-0 rounded-3xl lg:block">
        <SidebarContent footer={userMenu} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <Topbar userMenu={userMenu} />
        <main className="flex-1 px-1 pt-4 pb-10 sm:px-3 sm:pt-6">{children}</main>
      </div>

      <Suspense fallback={null}>
        <FlashToast />
      </Suspense>
    </div>
  );
}
