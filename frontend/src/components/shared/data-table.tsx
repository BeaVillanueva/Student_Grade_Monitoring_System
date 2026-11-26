import type { Key, ReactNode } from "react";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/feedback/states";
export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
};
export function DataTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  actions,
  loading = false,
  error,
  onRetry,
  emptyMessage = "No records to display.",
}: {
  caption: string;
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => Key;
  actions?: (row: T) => ReactNode;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  emptyMessage?: string;
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-lg border bg-card">
      <div
        role="region"
        aria-label={caption}
        tabIndex={0}
        className="overflow-x-auto"
      >
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-secondary text-primary">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className="px-[var(--table-cell-x)] py-[var(--table-cell-y)] font-semibold leading-5"
                >
                  {col.header}
                </th>
              ))}
              {actions && (
                <th scope="col" className="px-4 py-3 text-right">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {!loading &&
              !error &&
              rows.map((row) => (
                <tr key={rowKey(row)} className="border-t hover:bg-background">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="min-w-28 max-w-sm px-[var(--table-cell-x)] py-[var(--table-cell-y)] align-top [overflow-wrap:anywhere]"
                    >
                      {col.cell(row)}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-4 py-3 text-right">{actions(row)}</td>
                  )}
                </tr>
              ))}
            {(loading || error || rows.length === 0) && (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)}>
                  {loading ? (
                    <LoadingState />
                  ) : error ? (
                    <ErrorState description={error} onRetry={onRetry} />
                  ) : (
                    <EmptyState description={emptyMessage} />
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
