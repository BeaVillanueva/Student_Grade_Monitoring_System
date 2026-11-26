import type { ReactNode } from "react";
import { Card } from "@/components/ui/display";
export function SummaryCard({
  label,
  value,
  description,
  icon,
  tone = "blue",
}: {
  label: string;
  value: ReactNode;
  description?: string;
  icon?: ReactNode;
  tone?: "blue" | "violet" | "green" | "amber" | "rose" | "teal";
}) {
  const colors = {
    blue: "bg-blue-100 text-blue-700",
    violet: "bg-violet-100 text-violet-700",
    green: "bg-green-100 text-green-700",
    amber: "bg-amber-100 text-amber-800",
    rose: "bg-rose-100 text-rose-700",
    teal: "bg-teal-100 text-teal-700",
  };
  return (
    <Card className="flex h-full min-w-0 items-start gap-4 rounded-xl border-slate-200/90 shadow-[0_6px_24px_rgba(15,23,42,0.06)]">
      {icon && (
        <span
          aria-hidden="true"
          className={`flex size-12 shrink-0 items-center justify-center rounded-xl [&_svg]:size-6 ${colors[tone]}`}
        >
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <h3
          aria-level={2}
          className="min-h-10 min-w-0 break-words text-sm font-medium leading-5 text-primary"
        >
          {label}
        </h3>
        <p className="mt-2 break-words text-4xl font-bold tabular-nums tracking-tight text-slate-900">
          {value}
        </p>
        {description && (
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        )}
      </div>
    </Card>
  );
}
