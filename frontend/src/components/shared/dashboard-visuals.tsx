import type { ReactNode } from "react";
import { Link } from "react-router";
import { ArrowUpRight, ChartNoAxesCombined, Zap } from "lucide-react";
import { Card } from "@/components/ui/display";
import {
  distributionData,
  type gradeComparisonRows,
} from "@/features/shared/dashboard-chart-data";

export const dashboardCardClass =
  "rounded-xl border-slate-200/90 shadow-[0_6px_24px_rgba(15,23,42,0.06)]";
const colors: Record<string, string> = {
  Enrolled: "#2563eb",
  Dropped: "#b45309",
  Completed: "#0f766e",
  Pending: "#7c3aed",
  Resolved: "#15803d",
  Midterm: "#2563eb",
  Final: "#0f766e",
};
const percent = (value: number | null) =>
  value === null ? "—" : `${Number(value.toFixed(1))}%`;

export function DistributionChart({
  title,
  values,
  variant = "donut",
  description,
}: {
  title: string;
  values: Record<string, number>;
  variant?: "donut" | "bars";
  description?: string;
}) {
  const data = distributionData(values);
  let offset = 0;
  return (
    <Card className={dashboardCardClass}>
      <h2 className="flex items-center gap-2 text-base">
        <ChartNoAxesCombined
          className="size-5 shrink-0 text-primary"
          aria-hidden="true"
        />
        {title}
      </h2>
      {description && (
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      )}
      {!data.valid ? (
        <p role="status" className="mt-6 text-sm text-muted-foreground">
          Chart data is unavailable. Automatic refresh will try again.
        </p>
      ) : (
        <>
          <div
            className={
              variant === "donut"
                ? "mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-5"
                : "mt-6"
            }
          >
            {variant === "donut" && (
              <svg
                viewBox="0 0 200 200"
                className="size-44 max-w-full shrink-0"
                role="img"
                aria-label={`${title}: ${data.total.toLocaleString()} records. ${data.entries.map((entry) => `${entry.label}: ${entry.count}, ${percent(entry.percentage)}`).join("; ")}`}
              >
                <circle
                  cx="100"
                  cy="100"
                  r="72"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="23"
                />
                {data.total > 0 &&
                  data.entries.map((entry) => {
                    const size = entry.percentage ?? 0;
                    const start = offset;
                    offset += size;
                    return size > 0 ? (
                      <circle
                        key={entry.label}
                        cx="100"
                        cy="100"
                        r="72"
                        fill="none"
                        stroke={colors[entry.label] ?? "#1e3a5f"}
                        strokeWidth="23"
                        pathLength="100"
                        strokeDasharray={`${size} ${100 - size}`}
                        strokeDashoffset={-start}
                        transform="rotate(-90 100 100)"
                      />
                    ) : null;
                  })}
                <text
                  x="100"
                  y="97"
                  textAnchor="middle"
                  fill="#0f172a"
                  fontSize="32"
                  fontWeight="700"
                >
                  {data.total.toLocaleString()}
                </text>
                <text
                  x="100"
                  y="121"
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize="12"
                >
                  Total records
                </text>
              </svg>
            )}
            <dl className="min-w-0 flex-1 basis-40 space-y-4">
              {data.entries.map((entry) => (
                <div key={entry.label}>
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
                    <dt className="flex items-center gap-2">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{
                          backgroundColor: colors[entry.label] ?? "#1e3a5f",
                        }}
                        aria-hidden="true"
                      />
                      {entry.label}
                    </dt>
                    <dd className="font-semibold tabular-nums text-foreground">
                      {entry.count.toLocaleString()}{" "}
                      <span className="font-normal text-muted-foreground">
                        ({percent(entry.percentage)})
                      </span>
                    </dd>
                  </div>
                  {variant === "bars" && (
                    <div
                      className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100"
                      aria-hidden="true"
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${entry.percentage ?? 0}%`,
                          backgroundColor: colors[entry.label] ?? "#1e3a5f",
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </dl>
          </div>
          <p className="mt-5 text-xs leading-5 text-muted-foreground">
            {data.total === 0
              ? "No records yet."
              : "Percentages are rounded to one decimal place."}
          </p>
        </>
      )}
    </Card>
  );
}

export function GradeComparisonChart({
  rows,
}: {
  rows: ReturnType<typeof gradeComparisonRows>;
}) {
  return (
    <Card className={dashboardCardClass}>
      <h2 className="flex items-center gap-2 text-base">
        <ChartNoAxesCombined
          className="size-5 text-primary"
          aria-hidden="true"
        />
        Midterm &amp; Final comparison
      </h2>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        Recorded scores on a 0–100 scale, grouped by enrollment and academic
        term.
      </p>
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
        {["Midterm", "Final"].map((type) => (
          <span className="flex items-center gap-2" key={type}>
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: colors[type] }}
              aria-hidden="true"
            />
            {type}
          </span>
        ))}
      </div>
      {!rows.length ? (
        <p className="py-8 text-sm text-muted-foreground">
          No enrolled subjects to compare yet.
        </p>
      ) : (
        <div
          className="mt-5 max-h-96 space-y-6 overflow-y-auto pr-2 focus-visible:outline-offset-2"
          role="region"
          aria-label="Grade comparisons by enrollment"
          tabIndex={0}
        >
          {rows.map((row) => (
            <div key={row.enrollmentId}>
              <h3 className="text-sm font-semibold">{row.subject}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {row.term} · Enrollment #{row.enrollmentId}
              </p>
              <dl className="mt-3 space-y-3">
                {(["Midterm", "Final"] as const).map((type) => {
                  const score = row[type];
                  const valid =
                    score === null ||
                    (Number.isFinite(score) && score >= 0 && score <= 100);
                  return (
                    <div key={type}>
                      <div className="mb-1.5 flex justify-between gap-3 text-xs">
                        <dt>{type}</dt>
                        <dd className="font-medium tabular-nums">
                          {!valid
                            ? "Unavailable"
                            : score === null
                              ? "Not recorded"
                              : score.toFixed(2)}
                        </dd>
                      </div>
                      <div
                        className="h-2.5 overflow-hidden rounded-full bg-slate-100"
                        aria-hidden="true"
                      >
                        {valid && score !== null && (
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${score}%`,
                              backgroundColor: colors[type],
                            }}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </dl>
            </div>
          ))}
        </div>
      )}
      <p className="mt-5 text-xs text-muted-foreground">
        Missing grades are Not recorded, never zero. Recorded zero scores
        display 0.00.
      </p>
    </Card>
  );
}

export function DashboardActions({ children }: { children: ReactNode }) {
  return (
    <Card className={dashboardCardClass}>
      <h2 className="mb-5 flex items-center gap-2 text-base">
        <Zap className="size-5 text-primary" aria-hidden="true" />
        Quick actions
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </Card>
  );
}
export function DashboardAction({
  to,
  icon,
  children,
}: {
  to: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      className="group flex min-h-20 min-w-0 items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm font-semibold text-primary shadow-sm hover:border-blue-200 hover:bg-blue-50/50 focus-visible:outline-offset-2"
    >
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 [&_svg]:size-5"
        aria-hidden="true"
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">{children}</span>
      <ArrowUpRight
        className="size-4 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
    </Link>
  );
}
