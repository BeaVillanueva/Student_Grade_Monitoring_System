import type { NavigationItem } from "@/app/navigation";
import { PageHeader } from "@/components/layout/headers";
import { Card } from "@/components/ui/display";
export function ModulePlaceholder({ item }: { item: NavigationItem }) {
  const Icon = item.icon;
  return (
    <>
      <PageHeader title={item.label} description={item.description} />
      <Card>
        <div className="flex flex-col items-center px-2 py-12 text-center">
          <span className="mb-4 flex size-12 items-center justify-center rounded-lg bg-secondary text-primary">
            <Icon className="size-6" aria-hidden="true" />
          </span>
          <h2 className="text-base">
            {item.key === "dashboard"
              ? "Your academic workspace"
              : `${item.label} is not connected yet`}
          </h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            {item.key === "dashboard"
              ? "Dashboard content will be connected to the existing API in a later approved step."
              : "This is a temporary module page. Its permitted functionality will be added in a later approved step."}
          </p>
        </div>
      </Card>
    </>
  );
}
