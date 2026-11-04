"use client";

import { useId, useState, type ComponentProps, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FormFieldProps = Omit<ComponentProps<"input">, "id"> & {
  label: string;
  name: string;
  errors?: string[];
  hint?: ReactNode;
  /** Elemento ao lado do rótulo (ex.: link "Esqueci a senha"). */
  labelAside?: ReactNode;
};

/** Rótulo + campo + mensagens de erro/dica, com ligações de acessibilidade. */
export function FormField({
  label,
  name,
  errors,
  hint,
  labelAside,
  type = "text",
  className,
  ...props
}: FormFieldProps) {
  const id = useId();
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const hasError = Boolean(errors?.length);
  const describedBy = [hasError ? `${id}-error` : null, hint ? `${id}-hint` : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {labelAside}
      </div>
      <div className="relative">
        <Input
          id={id}
          name={name}
          type={isPassword && showPassword ? "text" : type}
          aria-invalid={hasError || undefined}
          aria-describedby={describedBy || undefined}
          className={cn("h-10 rounded-xl px-3", isPassword && "pr-10", className)}
          {...props}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute inset-y-0 right-0 grid w-10 place-items-center rounded-r-xl text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            aria-pressed={showPassword}
          >
            {showPassword ? (
              <EyeOff className="size-4" aria-hidden />
            ) : (
              <Eye className="size-4" aria-hidden />
            )}
          </button>
        ) : null}
      </div>
      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {hasError ? (
        <p id={`${id}-error`} className="text-xs font-medium text-destructive">
          {errors?.[0]}
        </p>
      ) : null}
    </div>
  );
}
