import { prisma } from "@/lib/db";
import type { UserDetail } from "@/lib/users/queries";
import type { ViewMode } from "@/lib/users/permission";

type ServicePermissionInput = {
  clusterArn: string;
  clusterName: string;
  serviceArn: string;
  serviceName: string;
};

type ViewPermissionInput = {
  clusterArn: string;
  clusterName: string;
  serviceArn: string;
  serviceName: string;
};

/** ユーザの userId・role・viewMode を更新して更新後のユーザを返す */
export async function updateUser(
  id: string,
  data: { userId?: string; role?: "Admin" | "Editor" | "Viewer"; viewMode?: ViewMode }
): Promise<UserDetail> {
  const updated = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      userId: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      viewMode: true,
      servicePermissions: {
        select: {
          id: true,
          clusterArn: true,
          clusterName: true,
          serviceArn: true,
          serviceName: true,
        },
      },
      viewPermissions: {
        select: {
          id: true,
          clusterArn: true,
          clusterName: true,
          serviceArn: true,
          serviceName: true,
        },
      },
    },
  });
  return updated as UserDetail;
}

/** ユーザを削除する（関連する ServicePermission は CASCADE 削除される） */
export async function deleteUser(id: string): Promise<void> {
  await prisma.user.delete({ where: { id } });
}

/**
 * Editor ユーザへサービス操作権限を追加する。
 * 同一 serviceArn が既に存在する場合はスキップする（重複なし）。
 */
export async function addUserServicePermissions(
  userId: string,
  permissions: ServicePermissionInput[]
): Promise<void> {
  await prisma.servicePermission.createMany({
    data: permissions.map((p) => ({ userId, ...p })),
    skipDuplicates: true,
  });
}

/** 指定した serviceArn の操作権限を削除する */
export async function removeUserServicePermissions(
  userId: string,
  serviceArns: string[]
): Promise<void> {
  await prisma.servicePermission.deleteMany({
    where: {
      userId,
      serviceArn: { in: serviceArns },
    },
  });
}

/**
 * ユーザへサービス閲覧権限を追加する。
 * 同一 serviceArn が既に存在する場合はスキップする（重複なし）。
 */
export async function addUserViewPermissions(
  userId: string,
  permissions: ViewPermissionInput[]
): Promise<void> {
  await prisma.viewPermission.createMany({
    data: permissions.map((p) => ({ userId, ...p })),
    skipDuplicates: true,
  });
}

/** 指定した serviceArn の閲覧権限を削除する */
export async function removeUserViewPermissions(
  userId: string,
  serviceArns: string[]
): Promise<void> {
  await prisma.viewPermission.deleteMany({
    where: {
      userId,
      serviceArn: { in: serviceArns },
    },
  });
}
