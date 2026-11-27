import { useId, type ComponentProps, type ReactNode } from "react";
import { Search } from "lucide-react";
import { Input, Label } from "@/components/ui/form-controls";
export function SearchInput({
  label = "Search",
  scopeDescription,
  id: providedId,
  ...props
}: Omit<ComponentProps<"input">, "type"> & {
  label?: string;
  scopeDescription?: string;
}) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  return (
    <div className="min-w-0 space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          {...props}
          id={id}
          type="search"
          className="pl-10"
          aria-describedby={scopeDescription ? `${id}-scope` : undefined}
        />
      </div>
      {scopeDescription && (
        <p id={`${id}-scope`} className="text-xs leading-5 text-muted-foreground">
          {scopeDescription}
        </p>
      )}
    </div>
  );
}
export function FilterControls({
  children,
  description,
  onReset,
}: {
  children: ReactNode;
  description: string;
  onReset?: () => void;
}) {
  return (
    <fieldset className="min-w-0 rounded-lg border bg-card p-4">
      <legend className="px-1 text-sm font-semibold">Filters</legend>
      <p className="mb-4 text-sm text-muted-foreground">{description}</p>
      <div className="flex flex-wrap items-end gap-4">
        {children}
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="min-h-control rounded-md px-3 text-sm font-medium text-primary underline underline-offset-4"
          >
            Reset filters
          </button>
        )}
      </div>
    </fieldset>
  );
}
