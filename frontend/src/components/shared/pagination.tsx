import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/form-controls";
import { useId } from "react";
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  disabled = false,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const totalPages = Math.ceil(total / pageSize);
  return (
    <nav
      aria-label="Table pagination"
      className="flex flex-wrap items-center justify-between gap-4 py-4"
    >
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {total === 0
          ? "No results"
          : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        {onPageSizeChange && (
          <>
            <Label htmlFor={id}>Rows</Label>
            <Select
              id={id}
              value={pageSize}
              disabled={disabled}
              className="w-20"
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
            >
              {[10, 25, 50, 100].map((size) => (
                <option key={size}>{size}</option>
              ))}
            </Select>
          </>
        )}
        <Button
          variant="outline"
          size="icon"
          aria-label="Previous page"
          disabled={disabled || page <= 1 || total === 0}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft aria-hidden="true" />
        </Button>
        <span className="text-sm">
          Page {totalPages === 0 ? 0 : page} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="icon"
          aria-label="Next page"
          disabled={disabled || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}
