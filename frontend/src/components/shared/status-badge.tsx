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
    <Badge tone={tone}>
      <Icon className="size-3.5" aria-hidden="true" />
      {status}
    </Badge>
  );
}
