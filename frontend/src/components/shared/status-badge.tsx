import { Badge, toneIcons, type Tone } from "@/components/ui/display";
const statusTones: Record<string, Tone> = {
  Active: "success",
  Inactive: "neutral",
  Enrolled: "info",
  Dropped: "danger",
  Completed: "success",
  Pending: "warning",
  Resolved: "success",
};
export function StatusBadge({ status }: { status: string }) {
  const tone = statusTones[status] ?? "neutral";
  const Icon = toneIcons[tone];
  return (
    <Badge
      tone={tone}
      className="w-max shrink-0 whitespace-nowrap [overflow-wrap:normal]"
    >
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      {status}
    </Badge>
  );
}
