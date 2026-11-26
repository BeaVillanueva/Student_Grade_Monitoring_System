import { useState, type ReactNode } from "react";
import { BookOpen, ChevronDown, GraduationCap, Info, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Checkbox,
  Input,
  Label,
  PasswordInput,
  Select,
  Textarea,
} from "@/components/ui/form-controls";
import {
  Alert,
  Avatar,
  Badge,
  Card,
  Separator,
  Skeleton,
} from "@/components/ui/display";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogClose,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  Tooltip,
  TooltipProvider,
} from "@/components/ui/overlays";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { PageHeader, SectionHeader } from "@/components/layout/headers";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/feedback/states";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { DataTable } from "@/components/shared/data-table";
import { FilterControls, SearchInput } from "@/components/shared/filters";
import { FormField } from "@/components/shared/form-field";
import { Pagination } from "@/components/shared/pagination";
import { StatusBadge } from "@/components/shared/status-badge";
import { SummaryCard } from "@/components/shared/summary-card";

const sections = [
  ["foundations", "Foundations"],
  ["controls", "Controls"],
  ["feedback", "Feedback"],
  ["overlays", "Overlays"],
  ["tables", "Tables & filters"],
] as const;
function PreviewSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <SectionHeader title={title} description={description} />
      {children}
    </section>
  );
}
function Preview() {
  const notify = useToast();
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [filter, setFilter] = useState("all");
  return (
    <>
      <a
        href="#preview-content"
        className="sr-only z-[70] rounded-md bg-card p-3 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-md bg-primary text-white">
              <GraduationCap className="size-6" aria-hidden="true" />
            </span>
            <div>
              <p className="font-semibold text-primary">SGMS</p>
              <p className="text-xs text-muted-foreground">
                Student Grade Monitoring System
              </p>
            </div>
          </div>
          <Badge>Development preview</Badge>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[12rem_minmax(0,1fr)] lg:px-8">
        <aside>
          <nav
            aria-label="Design system sections"
            className="flex flex-wrap gap-1 lg:sticky lg:top-6 lg:flex-col"
          >
            <p className="mb-3 hidden px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:block">
              Component library
            </p>
            {sections.map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                className="rounded-md px-3 py-3 text-sm font-medium text-primary hover:bg-slate-200"
              >
                {label}
              </a>
            ))}
          </nav>
        </aside>
        <main id="preview-content" className="min-w-0 space-y-10" tabIndex={-1}>
          <PageHeader
            title="Interface foundations"
            description="A focused, accessible visual language for academic workflows. These are component demonstrations, not application records."
            actions={
              <Button
                variant="outline"
                onClick={() =>
                  notify({
                    title: "Preview notification",
                    description: "This is a visual demonstration only.",
                  })
                }
              >
                Preview notification
              </Button>
            }
          />
          <Alert title="Design system preview" tone="info">
            Development only. No account session, academic data, dashboard
            metrics, or API responses are used.
          </Alert>
          <PreviewSection
            id="foundations"
            title="Foundations"
            description="A restrained palette, clear typography, and consistent surfaces."
          >
            <Card>
              <h3 className="mb-4">Color palette</h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {[
                  ["Navy", "#1E3A5F"],
                  ["Accent blue", "#2563EB"],
                  ["Background", "#F8FAFC"],
                  ["Success", "#15803D"],
                  ["Warning", "#D97706"],
                  ["Danger", "#DC2626"],
                ].map(([label, color]) => (
                  <div key={label}>
                    <div
                      className="mb-2 h-14 rounded-md border"
                      style={{ backgroundColor: color }}
                      aria-hidden="true"
                    />
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{color}</p>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="space-y-3">
                <p className="text-2xl font-semibold tracking-tight">
                  Page title
                </p>
                <p className="text-xl font-semibold">Section title</p>
                <p className="text-base font-semibold">Card title</p>
                <p className="text-sm leading-6 text-muted-foreground">
                  Supporting copy uses a local system font and comfortable line
                  spacing.
                </p>
              </div>
            </Card>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <SummaryCard
                label="Summary card specimen"
                value="—"
                description="No metric is loaded in this preview."
                icon={<BookOpen />}
              />
              <Card>
                <h3 className="mb-4">Identity and status</h3>
                <div className="flex items-center gap-3">
                  <Avatar name="Preview avatar" />
                  <span className="text-sm text-muted-foreground">
                    Avatar fallback
                  </span>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  {[
                    "Active",
                    "Inactive",
                    "Enrolled",
                    "Dropped",
                    "Completed",
                    "Pending",
                    "Resolved",
                  ].map((status) => (
                    <StatusBadge key={status} status={status} />
                  ))}
                </div>
              </Card>
            </div>
          </PreviewSection>
          <PreviewSection
            id="controls"
            title="Controls"
            description="Consistent 44px default controls with explicit labels and visible focus."
          >
            <Card>
              <h3 className="mb-4">Buttons</h3>
              <div className="flex flex-wrap gap-3">
                {(
                  [
                    "primary",
                    "secondary",
                    "outline",
                    "ghost",
                    "destructive",
                  ] as const
                ).map((variant) => (
                  <Button
                    key={variant}
                    variant={variant}
                    onClick={() =>
                      notify({ title: `${variant} button demonstration` })
                    }
                  >
                    {variant[0].toUpperCase() + variant.slice(1)}
                  </Button>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button size="sm">Small</Button>
                <Button>Default</Button>
                <Button size="lg">Large</Button>
                <Button disabled>Disabled</Button>
                <Tooltip content="Icon buttons also have accessible names">
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Show icon button demonstration"
                    onClick={() =>
                      notify({ title: "Icon button demonstration" })
                    }
                  >
                    <Plus aria-hidden="true" />
                  </Button>
                </Tooltip>
              </div>
              <Separator />
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField
                  label="Text input"
                  description="A placeholder for component review."
                >
                  {(props) => (
                    <Input {...props} placeholder="Enter sample text" />
                  )}
                </FormField>
                <FormField
                  label="Password input"
                  description="Visibility toggle demonstration only."
                >
                  {(props) => (
                    <PasswordInput
                      {...props}
                      autoComplete="off"
                      placeholder="Enter sample text"
                    />
                  )}
                </FormField>
                <FormField label="Select">
                  {(props) => (
                    <Select {...props} defaultValue="">
                      <option value="" disabled>
                        Choose an option
                      </option>
                      <option value="one">Option one</option>
                      <option value="two">Option two</option>
                    </Select>
                  )}
                </FormField>
                <FormField
                  label="Validation example"
                  required
                  error="Example validation feedback; no request was submitted."
                >
                  {(props) => (
                    <Input {...props} placeholder="Required sample field" />
                  )}
                </FormField>
                <div className="sm:col-span-2">
                  <FormField label="Textarea">
                    {(props) => (
                      <Textarea
                        {...props}
                        placeholder="Sample text for visual review"
                      />
                    )}
                  </FormField>
                </div>
              </div>
              <div className="mt-5 flex min-h-control items-center gap-3">
                <Checkbox id="preview-checkbox" />
                <Label htmlFor="preview-checkbox">Example checkbox</Label>
              </div>
            </Card>
          </PreviewSection>
          <PreviewSection
            id="feedback"
            title="Feedback & states"
            description="Text and icons communicate state without relying on color alone."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Alert title="Success message" tone="success">
                Example supporting message.
              </Alert>
              <Alert title="Warning message" tone="warning">
                Example supporting message.
              </Alert>
              <Alert title="Error message" tone="danger">
                Example supporting message.
              </Alert>
              <Alert title="Information message">
                Example supporting message.
              </Alert>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Card>
                <h3>Loading state specimen</h3>
                <LoadingState label="Loading preview…" />
                <div className="space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </Card>
              <Card>
                <EmptyState
                  title="Empty state specimen"
                  description="There are no demonstration records."
                />
              </Card>
            </div>
            <div className="mt-4">
              <ErrorState
                title="Error state specimen"
                description="This is a component example, not a failed API request."
                onRetry={() =>
                  notify({
                    title: "Retry interaction demonstrated",
                    description: "No network request was sent.",
                  })
                }
              />
            </div>
          </PreviewSection>
          <PreviewSection
            id="overlays"
            title="Dialogs, menus & notifications"
            description="Accessible primitives provide focus handling and keyboard interaction."
          >
            <Card>
              <div className="flex flex-wrap gap-3">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline">Open dialog</Button>
                  </DialogTrigger>
                  <DialogContent
                    title="Dialog specimen"
                    description="Tab through the controls. Escape closes this dialog and returns focus to its trigger."
                  >
                    <FormField label="Sample field">
                      {(props) => (
                        <Input {...props} placeholder="Optional sample text" />
                      )}
                    </FormField>
                    <div className="mt-6 flex justify-end">
                      <DialogClose asChild>
                        <Button>Done</Button>
                      </DialogClose>
                    </div>
                  </DialogContent>
                </Dialog>
                <ConfirmationDialog
                  trigger={<Button variant="outline">Open confirmation</Button>}
                  title="Confirm demonstration?"
                  description="This only displays a notification. No records will be changed."
                  confirmLabel="Confirm preview"
                  destructive
                  onConfirm={() =>
                    notify({
                      title: "Confirmation demonstrated",
                      description: "No data was changed.",
                      tone: "success",
                    })
                  }
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      Example actions
                      <ChevronDown aria-hidden="true" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem
                      onSelect={() =>
                        notify({ title: "Menu action demonstrated" })
                      }
                    >
                      Preview action
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled>
                      Unavailable action
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Tooltip content="Helpful context supplements the button label.">
                  <Button
                    variant="ghost"
                    onClick={() => notify({ title: "Help example" })}
                  >
                    <Info aria-hidden="true" />
                    Tooltip example
                  </Button>
                </Tooltip>
              </div>
              <Separator />
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="secondary"
                  onClick={() =>
                    notify({
                      title: "Success notification",
                      description: "A demonstration with manual dismissal.",
                      tone: "success",
                    })
                  }
                >
                  Success toast
                </Button>
                <Button
                  variant="secondary"
                  onClick={() =>
                    notify({
                      title: "Warning notification",
                      description: "A demonstration with manual dismissal.",
                      tone: "warning",
                    })
                  }
                >
                  Warning toast
                </Button>
              </div>
            </Card>
          </PreviewSection>
          <PreviewSection
            id="tables"
            title="Tables & filters"
            description="Controlled components accept future pagination and filtering state without assuming unsupported API filters."
          >
            <FilterControls
              description="Visual controls only. No dataset is searched or filtered."
              onReset={() => {
                setSearch("");
                setFilter("all");
              }}
            >
              <div className="w-full sm:max-w-sm">
                <SearchInput
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  scopeDescription="Preview only; no server-side search is implemented."
                />
              </div>
              <div className="w-full space-y-2 sm:w-44">
                <Label htmlFor="preview-filter">Example filter</Label>
                <Select
                  id="preview-filter"
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                >
                  <option value="all">All options</option>
                  <option value="selected">Selected option</option>
                </Select>
              </div>
            </FilterControls>
            <div className="mt-5">
              <DataTable<{ label: string; note: string }>
                caption="Empty component demonstration table"
                columns={[
                  {
                    key: "label",
                    header: "Component",
                    cell: (row) => row.label,
                  },
                  {
                    key: "note",
                    header: "Description",
                    cell: (row) => row.note,
                  },
                ]}
                rows={[]}
                rowKey={(row) => row.label}
                emptyMessage="This table intentionally contains no sample records."
              />
              <Pagination
                page={1}
                pageSize={pageSize}
                total={0}
                onPageChange={() => {}}
                onPageSizeChange={setPageSize}
              />
            </div>
          </PreviewSection>
          <footer className="border-t py-6 text-xs leading-5 text-muted-foreground">
            SGMS component preview · Local system fonts · No external font
            service · No application routes or API integration
          </footer>
        </main>
      </div>
    </>
  );
}
export default function DesignSystemPreview() {
  return (
    <TooltipProvider delayDuration={300}>
      <ToastProvider>
        <Preview />
      </ToastProvider>
    </TooltipProvider>
  );
}
