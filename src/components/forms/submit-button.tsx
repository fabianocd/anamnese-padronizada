import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SubmitButtonProps = React.ComponentProps<typeof Button> & {
  pending: boolean;
  pendingLabel?: string;
};

export function SubmitButton({
  pending,
  pendingLabel,
  children,
  className,
  disabled,
  ...props
}: SubmitButtonProps) {
  return (
    <Button
      type="submit"
      size="lg"
      disabled={pending || disabled}
      aria-busy={pending || undefined}
      className={cn("h-10 rounded-xl px-4", className)}
      {...props}
    >
      {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}
