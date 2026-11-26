import type { ReactNode } from "react";
import { Card } from "@/components/ui/display";
export function SummaryCard({
  label,
  value,
  description,
  icon,
}: {
  label: string;
  value: ReactNode;
  description?: string;
  icon?: ReactNode;
}) {
  return (
    <Card className="flex h-full min-w-0 flex-col">
      <div className="flex min-h-10 items-start justify-between gap-3">
        <h3
          aria-level={2}
          className="min-w-0 break-words text-sm font-medium leading-5 text-muted-foreground"
        >
          {label}
        </h3>
        {icon && (
          <span
            aria-hidden="true"
            className="shrink-0 text-primary [&_svg]:size-5"
          >
            {icon}
          </span>
        )}
      </div>
      <p className="mt-3 break-words text-2xl font-semibold tabular-nums tracking-tight">
        {value}
      </p>
      {description && (
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      )}
    </Card>
  );
}
