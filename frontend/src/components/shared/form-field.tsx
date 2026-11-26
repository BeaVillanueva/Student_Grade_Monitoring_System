import { useId, type ReactNode } from "react";
import { Label } from "@/components/ui/form-controls";
type FieldAccessibility = {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid": boolean;
  "aria-required": boolean;
};
export function FormField({
  label,
  description,
  error,
  required = false,
  children,
}: {
  label: string;
  description?: string;
  error?: string;
  required?: boolean;
  children: (props: FieldAccessibility) => ReactNode;
}) {
  const id = useId();
  const describedBy =
    [description ? `${id}-hint` : "", error ? `${id}-error` : ""]
      .filter(Boolean)
      .join(" ") || undefined;
  return (
    <div className="min-w-0 space-y-2">
      <Label htmlFor={id}>
        {label}
        {required && (
          <span className="ml-1 text-muted-foreground">(required)</span>
        )}
      </Label>
      {children({
        id,
        "aria-describedby": describedBy,
        "aria-invalid": Boolean(error),
        "aria-required": required,
      })}
      {description && (
        <p
          id={`${id}-hint`}
          className="text-xs leading-5 text-muted-foreground"
        >
          {description}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
