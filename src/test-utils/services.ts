import type { ServiceInfo } from "@/lib/ecs";

const BASE_SERVICE: ServiceInfo = {
  clusterArn: "arn:aws:ecs:ap-northeast-1:123456789012:cluster/test-cluster",
  clusterName: "test-cluster",
  serviceArn: "arn:aws:ecs:ap-northeast-1:123456789012:service/test-cluster/test-service",
  serviceName: "test-service",
  desiredCount: 1,
  runningCount: 1,
  pendingCount: 0,
  status: "ACTIVE",
};

/** ServiceInfo を部分上書きして生成する基本ファクトリ */
export function buildService(overrides: Partial<ServiceInfo> = {}): ServiceInfo {
  return { ...BASE_SERVICE, ...overrides };
}

/** 名前付きサービスを生成する（ARN も名前に合わせて更新） */
export function buildServiceWithName(
  name: string,
  overrides: Partial<ServiceInfo> = {}
): ServiceInfo {
  return buildService({
    serviceArn: `arn:aws:ecs:ap-northeast-1:123456789012:service/test-cluster/${name}`,
    serviceName: name,
    ...overrides,
  });
}

// ── ステータス別ファクトリ ──────────────────────────────────────────

/** 起動中: desiredCount > 0 かつ runningCount >= desiredCount */
export function buildRunningService(name = "running-service"): ServiceInfo {
  return buildServiceWithName(name, { desiredCount: 1, runningCount: 1 });
}

/** 起動処理中: desiredCount > 0 かつ runningCount < desiredCount */
export function buildStartingService(name = "starting-service"): ServiceInfo {
  return buildServiceWithName(name, { desiredCount: 1, runningCount: 0 });
}

/** 停止処理中: desiredCount = 0 かつ runningCount > 0 */
export function buildStoppingService(name = "stopping-service"): ServiceInfo {
  return buildServiceWithName(name, { desiredCount: 0, runningCount: 1 });
}

/** 停止中: desiredCount = 0 かつ runningCount = 0 */
export function buildStoppedService(name = "stopped-service"): ServiceInfo {
  return buildServiceWithName(name, { desiredCount: 0, runningCount: 0 });
}

/**
 * クラスター名とサービス名を指定してサービスを生成する。
 * ARN もクラスター名・サービス名に合わせて生成される。
 */
export function buildServiceInCluster(
  clusterName: string,
  serviceName: string,
  overrides: Partial<ServiceInfo> = {}
): ServiceInfo {
  return buildService({
    clusterArn: `arn:aws:ecs:ap-northeast-1:123456789012:cluster/${clusterName}`,
    clusterName,
    serviceArn: `arn:aws:ecs:ap-northeast-1:123456789012:service/${clusterName}/${serviceName}`,
    serviceName,
    ...overrides,
  });
}
