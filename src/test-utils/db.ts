/**
 * DB を使用するテスト向けのユーティリティ。
 * 実際の Prisma クライアントを使用する。
 * onTestFinished と組み合わせて使用し、テスト終了後に必ずクリーンアップする。
 */
import { prisma } from "@/lib/db";
import type { User, ServicePermission } from "@prisma/client";

function generateTestSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export type TestUserOverrides = Partial<
  Pick<User, "userId" | "email" | "password" | "role">
>;

/** テスト用ユーザを DB に作成して返す */
export async function createTestUser(
  overrides: TestUserOverrides = {}
): Promise<User> {
  const suffix = generateTestSuffix();
  return prisma.user.create({
    data: {
      userId: `test-user-${suffix}`,
      email: `test-${suffix}@test.local`,
      password: "test-hashed-password",
      role: "Viewer",
      ...overrides,
    },
  });
}

/** テスト用サービス操作権限を DB に作成して返す */
export async function createTestServicePermission(
  userId: string,
  overrides: Partial<
    Pick<
      ServicePermission,
      "clusterArn" | "clusterName" | "serviceArn" | "serviceName"
    >
  > = {}
): Promise<ServicePermission> {
  const suffix = generateTestSuffix();
  return prisma.servicePermission.create({
    data: {
      userId,
      clusterArn: `arn:aws:ecs:ap-northeast-1:123456789012:cluster/test-cluster`,
      clusterName: "test-cluster",
      serviceArn: `arn:aws:ecs:ap-northeast-1:123456789012:service/test-cluster/svc-${suffix}`,
      serviceName: `svc-${suffix}`,
      ...overrides,
    },
  });
}
