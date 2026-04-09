import type { ServiceInfo } from "@/lib/ecs";
import type { UserRole } from "@/lib/users/role";

export type ViewMode = "ALL" | "SYNC" | "CUSTOM";

export interface ServicePermission {
  clusterArn: string;
  clusterName: string;
  serviceArn: string;
  serviceName: string;
}

export interface ViewPermission {
  clusterArn: string;
  clusterName: string;
  serviceArn: string;
  serviceName: string;
}

/**
 * 権限追加 UI 向けのサービス絞り込み。
 * clusterFilter・serviceFilter は trim + 大文字小文字を無視した部分一致。
 * 空文字フィルタはそのフィールドを絞り込まない。
 */
export function filterServicesForPermission(
  services: ServiceInfo[],
  clusterFilter: string,
  serviceFilter: string
): ServiceInfo[] {
  const cluster = clusterFilter.trim().toLowerCase();
  const service = serviceFilter.trim().toLowerCase();

  return services.filter((s) => {
    const clusterMatch = cluster === "" || s.clusterName.toLowerCase().includes(cluster);
    const serviceMatch = service === "" || s.serviceName.toLowerCase().includes(service);
    return clusterMatch && serviceMatch;
  });
}

/**
 * 操作可能サービスを追加する。
 * serviceArn を重複排除キーとして使用し、既存・追加リスト内の重複を排除する。
 * 既存サービスは順序を維持し、新規サービスは末尾に追加する。
 */
export function addServicePermissions(
  current: ServicePermission[],
  toAdd: ServicePermission[]
): ServicePermission[] {
  const seen = new Set(current.map((p) => p.serviceArn));
  const result = [...current];

  for (const p of toAdd) {
    if (!seen.has(p.serviceArn)) {
      seen.add(p.serviceArn);
      result.push(p);
    }
  }

  return result;
}

/**
 * 操作可能サービスを削除する。
 * serviceArn で一致したサービスを一覧から除外する。
 */
export function removeServicePermissions(
  current: ServicePermission[],
  toRemove: ServicePermission[]
): ServicePermission[] {
  const removeArns = new Set(toRemove.map((p) => p.serviceArn));
  return current.filter((p) => !removeArns.has(p.serviceArn));
}

/**
 * 指定サービスへの操作（起動・停止・台数変更）が可能かを返す。
 * - Admin : 常に true
 * - Editor: permissions リストに含まれる場合のみ true
 * - Viewer: 常に false
 */
export function canOperateService(
  userRole: UserRole,
  permissions: ServicePermission[],
  serviceArn: string
): boolean {
  if (userRole === "Admin") return true;
  if (userRole === "Viewer") return false;
  return permissions.some((p) => p.serviceArn === serviceArn);
}

/** 全ロールがサービスを閲覧できるため、常に true を返す */
export function canViewServices(_userRole: UserRole): boolean {
  return true;
}

/**
 * 指定サービスの閲覧が可能かを返す。
 * - Admin    : 常に true
 * - ALL      : 常に true
 * - SYNC     : operationPermissions に含まれる場合のみ true
 * - CUSTOM   : viewPermissions に含まれる場合のみ true
 */
export function canViewService(
  userRole: UserRole,
  viewMode: ViewMode,
  viewPermissions: ViewPermission[],
  operationPermissions: ServicePermission[],
  serviceArn: string
): boolean {
  if (userRole === "Admin") return true;
  if (viewMode === "ALL") return true;
  if (viewMode === "SYNC") {
    return operationPermissions.some((p) => p.serviceArn === serviceArn);
  }
  return viewPermissions.some((p) => p.serviceArn === serviceArn);
}

/**
 * 閲覧権限に基づいてサービスリストをフィルタリングする。
 * - Admin / ALL : そのまま返す
 * - SYNC        : operationPermissions に含まれるサービスのみ
 * - CUSTOM      : viewPermissions に含まれるサービスのみ
 */
export function filterServicesByView(
  services: ServiceInfo[],
  userRole: UserRole,
  viewMode: ViewMode,
  viewPermissions: ViewPermission[],
  operationPermissions: ServicePermission[]
): ServiceInfo[] {
  if (userRole === "Admin" || viewMode === "ALL") return services;
  return services.filter((s) =>
    canViewService(userRole, viewMode, viewPermissions, operationPermissions, s.serviceArn)
  );
}

/**
 * 閲覧権限リストにサービスを追加する。
 * serviceArn を重複排除キーとして使用する。
 */
export function addViewPermissions(
  current: ViewPermission[],
  toAdd: ViewPermission[]
): ViewPermission[] {
  const seen = new Set(current.map((p) => p.serviceArn));
  const result = [...current];

  for (const p of toAdd) {
    if (!seen.has(p.serviceArn)) {
      seen.add(p.serviceArn);
      result.push(p);
    }
  }

  return result;
}

/**
 * 閲覧権限リストからサービスを削除する。
 * serviceArn で一致したサービスを一覧から除外する。
 */
export function removeViewPermissions(
  current: ViewPermission[],
  toRemove: ViewPermission[]
): ViewPermission[] {
  const removeArns = new Set(toRemove.map((p) => p.serviceArn));
  return current.filter((p) => !removeArns.has(p.serviceArn));
}
