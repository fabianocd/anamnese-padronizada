import { SidebarContent } from "@/components/app-shell/sidebar-content";
import { Topbar } from "@/components/app-shell/topbar";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[1600px] gap-3 p-3">
      <aside className="glass sticky top-3 hidden h-[calc(100dvh-1.5rem)] w-64 shrink-0 rounded-3xl lg:block">
        <SidebarContent />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <Topbar />
        <main className="flex-1 px-1 pt-4 pb-10 sm:px-3 sm:pt-6">{children}</main>
      </div>
    </div>
  );
}
