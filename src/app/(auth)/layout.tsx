import { Brand } from "@/components/app-shell/brand";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Brand />
        </div>
        <main className="glass-strong rounded-3xl p-6 sm:p-8">{children}</main>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Dados de saúde são sensíveis: identifique pacientes só por iniciais ou código.
        </p>
      </div>
    </div>
  );
}
