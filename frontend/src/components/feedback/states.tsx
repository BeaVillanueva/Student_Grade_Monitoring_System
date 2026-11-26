import type { ReactNode } from "react";
import { CircleAlert, Inbox, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-w-0 items-center justify-center gap-3 p-5 text-sm text-muted-foreground sm:p-8"
    >
      <LoaderCircle
        className="size-5 shrink-0 motion-safe:animate-spin"
        aria-hidden="true"
      />
      <span className="min-w-0 [overflow-wrap:anywhere]">{label}</span>
    </div>
  );
}
export function EmptyState({
  title = "No results",
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
      <Inbox className="size-8 text-muted-foreground" aria-hidden="true" />
      <p className="font-medium">{title}</p>
      {description && (
        <p className="max-w-sm text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}
export function ErrorState({
  title = "Unable to load",
  description = "Please try again.",
  onRetry,
  retrying = false,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-lg border bg-card p-6 text-center"
    >
      <CircleAlert className="size-6 text-destructive" aria-hidden="true" />
      <p className="font-semibold">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} disabled={retrying}>
          {retrying ? "Retrying…" : "Try again"}
        </Button>
      )}
    </div>
  );
}
