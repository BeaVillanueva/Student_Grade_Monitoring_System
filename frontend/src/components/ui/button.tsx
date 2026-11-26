import type { ComponentProps } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-[#152c49]",
        secondary: "bg-secondary text-secondary-foreground hover:bg-slate-200",
        outline:
          "border border-input bg-card text-foreground hover:bg-secondary",
        ghost: "text-primary hover:bg-secondary",
        destructive: "bg-destructive text-white hover:bg-red-700",
      },
      size: {
        sm: "min-h-9 px-3",
        default: "min-h-control px-4 py-2",
        lg: "min-h-12 px-6",
        icon: "size-control",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);
export type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };
export function Button({
  className,
  variant,
  size,
  asChild = false,
  type,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      {...(!asChild ? { type: type ?? "button" } : {})}
      {...props}
    />
  );
}
