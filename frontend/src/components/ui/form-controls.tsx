import { useState, type ComponentProps } from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check, Eye, EyeOff, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
export const controlClass =
  "min-h-control w-full min-w-0 rounded-md border border-input bg-card px-3 py-2 text-base sm:text-sm placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 aria-invalid:border-destructive";
export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(controlClass, className)} {...props} />;
}
export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("text-sm font-medium", className)} {...props} />;
}
export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(controlClass, className)} {...props} />;
}
export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(controlClass, "min-h-28 resize-y", className)}
      {...props}
    />
  );
}
export function PasswordInput({
  className,
  disabled,
  ...props
}: Omit<ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        {...props}
        disabled={disabled}
        type={visible ? "text" : "password"}
        className={cn("pr-14", className)}
      />
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-0 top-0"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        disabled={disabled}
        onClick={() => setVisible(!visible)}
      >
        {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
      </Button>
    </div>
  );
}
export function Checkbox({
  className,
  checked,
  ...props
}: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      checked={checked}
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-sm border border-input bg-card text-white data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=indeterminate]:bg-primary disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator>
        {checked === "indeterminate" ? (
          <Minus className="size-4" aria-hidden="true" />
        ) : (
          <Check className="size-4" aria-hidden="true" />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
