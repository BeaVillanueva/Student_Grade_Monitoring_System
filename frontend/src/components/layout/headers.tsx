import type { ReactNode } from "react";
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="contents">
      <div className="sr-only">
        <h1 className="break-words">{title}</h1>
        {description && (
          <p className="mt-2 max-w-2xl break-words text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="mb-6 flex max-w-full flex-wrap items-center justify-end gap-2 empty:hidden">
          {actions}
        </div>
      )}
    </header>
  );
}
export function SectionHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2>{title}</h2>
        {description && (
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions}
    </div>
  );
}
