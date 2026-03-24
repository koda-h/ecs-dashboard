import type { ServiceInfo } from "@/lib/ecs";

export type StatusFilter = "all" | "running" | "stopped";

/**
 * サービス一覧を起動ステータスグループで絞り込む。
 * - "all"     : すべてのサービスを返す
 * - "running" : desiredCount > 0 のサービス（起動中・起動処理中）
 * - "stopped" : desiredCount = 0 のサービス（停止中・停止処理中）
 */
export function filterServicesByStatus(
  services: ServiceInfo[],
  filter: StatusFilter
): ServiceInfo[] {
  if (filter === "all") return services;
  if (filter === "running") return services.filter((s) => s.desiredCount > 0);
  return services.filter((s) => s.desiredCount === 0);
}
