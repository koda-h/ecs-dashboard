import type { ServicePermission } from "@/lib/users/permission";

const REGION = "ap-northeast-1";
const ACCOUNT_ID = "123456789012";

/** ServicePermission を部分上書きして生成する基本ファクトリ */
export function buildServicePermission(
  overrides: Partial<ServicePermission> = {}
): ServicePermission {
  return {
    clusterArn: `arn:aws:ecs:${REGION}:${ACCOUNT_ID}:cluster/test-cluster`,
    clusterName: "test-cluster",
    serviceArn: `arn:aws:ecs:${REGION}:${ACCOUNT_ID}:service/test-cluster/test-service`,
    serviceName: "test-service",
    ...overrides,
  };
}

/**
 * クラスター名とサービス名を指定して ServicePermission を生成する。
 * ARN もクラスター名・サービス名に合わせて生成される。
 */
export function buildServicePermissionInCluster(
  clusterName: string,
  serviceName: string
): ServicePermission {
  return buildServicePermission({
    clusterArn: `arn:aws:ecs:${REGION}:${ACCOUNT_ID}:cluster/${clusterName}`,
    clusterName,
    serviceArn: `arn:aws:ecs:${REGION}:${ACCOUNT_ID}:service/${clusterName}/${serviceName}`,
    serviceName,
  });
}
