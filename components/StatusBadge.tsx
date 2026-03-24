"use client";

import { Badge } from "@/components/ui/badge";
import { getServiceStatus } from "@/lib/services/status";
import type { ServiceStatus } from "@/lib/services/status";
import type { ServiceInfo } from "@/lib/ecs";

export { getServiceStatus };

const statusConfig: Record<
  ServiceStatus,
  { label: string; className: string }
> = {
  running: {
    label: "起動中",
    className: "bg-green-100 text-green-800 border-green-200",
  },
  starting: {
    label: "起動処理中",
    className: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  stopping: {
    label: "停止処理中",
    className: "bg-orange-100 text-orange-800 border-orange-200",
  },
  stopped: {
    label: "停止中",
    className: "bg-gray-100 text-gray-600 border-gray-200",
  },
};

interface Props {
  service: ServiceInfo;
}

export function StatusBadge({ service }: Props) {
  const status = getServiceStatus(service);
  const config = statusConfig[status];

  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
