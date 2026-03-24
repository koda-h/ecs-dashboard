import type { ServiceInfo } from "@/lib/ecs";

export type ServiceStatus = "running" | "starting" | "stopping" | "stopped";

export function getServiceStatus(service: ServiceInfo): ServiceStatus {
  const { desiredCount, runningCount } = service;

  if (desiredCount === 0 && runningCount === 0) return "stopped";
  if (desiredCount === 0 && runningCount > 0) return "stopping";
  if (desiredCount > 0 && runningCount < desiredCount) return "starting";
  return "running";
}
