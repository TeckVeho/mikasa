import type { ProjectStatus } from "@logivoice/shared";
import { PROJECT_STATUS_LABELS } from "@logivoice/shared";
import { Badge } from "@/components/ui/badge";

const STATUS_VARIANT: Record<
  ProjectStatus,
  "neutral" | "warning" | "info" | "success"
> = {
  pending: "neutral",
  drawing_wait: "warning",
  in_progress: "info",
  shipping_wait: "warning",
  shipped: "success",
  completed: "success",
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <Badge variant={STATUS_VARIANT[status]}>
      {PROJECT_STATUS_LABELS[status]}
    </Badge>
  );
}
