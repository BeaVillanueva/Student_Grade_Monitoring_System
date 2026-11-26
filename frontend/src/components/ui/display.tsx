import { useState, type ComponentProps, type ReactNode } from "react";
import {
  CheckCircle2,
  CircleAlert,
  Info,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
export type Tone = "neutral" | "info" | "success" | "warning" | "danger";
export const tones: Record<Tone, string> = {
  neutral: "bg-secondary text-primary",
  info: "bg-blue-50 text-blue-800",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning-foreground",
  danger: "bg-danger-soft text-red-700",
};
export const toneIcons = {
  neutral: Info,
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  danger: CircleAlert,
};
export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-lg border bg-card p-5 shadow-panel sm:p-6",
        className,
      )}
      {...props}
    />
  );
}
export function Badge({
  tone = "neutral",
  className,
  ...props
}: ComponentProps<"span"> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
export function Separator({ className, ...props }: ComponentProps<"hr">) {
  return <hr className={cn("my-5 border-0 border-t", className)} {...props} />;
}
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "rounded-md bg-slate-200 motion-safe:animate-pulse",
        className,
      )}
      {...props}
    />
  );
}
export function Alert({
  title,
  children,
  tone = "info",
  className,
}: {
  title: string;
  children?: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  const Icon = toneIcons[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-md border border-current/20 p-4 text-sm",
        tones[tone],
        className,
      )}
    >
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 break-words">
        <p className="font-semibold">{title}</p>
        {children && <div className="mt-1">{children}</div>}
      </div>
    </div>
  );
}
export function Avatar({
  src,
  name,
  initials,
  className,
}: {
  src?: string;
  name: string;
  initials?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <span
      role="img"
      aria-label={name}
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-primary",
        className,
      )}
    >
      {src && !failed ? (
        <img
          src={src}
          alt=""
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : initials ? (
        <span aria-hidden="true" className="text-sm font-semibold">
          {initials}
        </span>
      ) : (
        <UserRound className="size-5" aria-hidden="true" />
      )}
    </span>
  );
}
