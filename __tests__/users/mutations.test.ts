import { describe, it, expect, beforeEach, onTestFinished } from "vitest";
import { prisma } from "@/lib/db";
import type { User, ServicePermission } from "@prisma/client";
import {
  updateUser,
  deleteUser,
  addUserServicePermissions,
  removeUserServicePermissions,
} from "@/lib/users/mutations";
import { createTestUser, createTestServicePermission } from "@/src/test-utils/db";

// ──────────────────────────────────────────────────────────────────
// updateUser / deleteUser / addUserServicePermissions / removeUserServicePermissions
// DB 結合テスト
//
// 事後条件: 戻り値 + DB の状態（SELECT）の両方を検証する。
// 不変条件: エラー発生時は DB が変化していないことを検証する。
// ──────────────────────────────────────────────────────────────────

describe("updateUser", () => {
  describe("userId を更新する場合", () => {
    let user: User;
    let newUserId: string;

    beforeEach(async () => {
      user = await createTestUser({ role: "Viewer" });
      newUserId = `updated-uid-${Date.now()}`;

      onTestFinished(async () => {
        await prisma.user.deleteMany({ where: { id: user.id } });
      });
    });

    it("戻り値に更新後の userId が反映されること", async () => {
      const result = await updateUser(user.id, { userId: newUserId });

      expect(result.userId).toBe(newUserId);
    });

    it("DB に userId の変更が保存されること", async () => {
      await updateUser(user.id, { userId: newUserId });

      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      expect(dbUser?.userId).toBe(newUserId);
    });

    it("userId 以外のフィールドは変化しないこと", async () => {
      await updateUser(user.id, { userId: newUserId });

      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      // email と role は変わらないこと
      expect(dbUser?.email).toBe(user.email);
      expect(dbUser?.role).toBe(user.role);
    });
  });

  describe("role を更新する場合", () => {
    let user: User;

    beforeEach(async () => {
      user = await createTestUser({ role: "Viewer" });

      onTestFinished(async () => {
        await prisma.user.deleteMany({ where: { id: user.id } });
      });
    });

    it("戻り値に更新後の role が反映されること", async () => {
      const result = await updateUser(user.id, { role: "Admin" });

      expect(result.role).toBe("Admin");
    });

    it("DB に role の変更が保存されること", async () => {
      await updateUser(user.id, { role: "Editor" });

      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      expect(dbUser?.role).toBe("Editor");
    });
  });

  describe("存在しない ID を指定した場合", () => {
    let existingUser: User;

    beforeEach(async () => {
      // 既存ユーザを作成（不変条件検証用の「無関係なユーザ」）
      existingUser = await createTestUser();

      onTestFinished(async () => {
        await prisma.user.deleteMany({ where: { id: existingUser.id } });
      });
    });

    it("エラーがスローされること", async () => {
      await expect(
        updateUser("non-existent-id-xxxxxxxx", { userId: "new-uid" })
      ).rejects.toThrow();
    });

    it("エラー発生時、既存ユーザのデータが変化しないこと（不変条件）", async () => {
      await expect(
        updateUser("non-existent-id-xxxxxxxx", { role: "Admin" })
      ).rejects.toThrow();

      const dbUser = await prisma.user.findUnique({ where: { id: existingUser.id } });
      expect(dbUser?.userId).toBe(existingUser.userId);
      expect(dbUser?.role).toBe(existingUser.role);
    });
  });
});

describe("deleteUser", () => {
  describe("存在するユーザを削除する場合", () => {
    let user: User;
    let permission: ServicePermission;

    beforeEach(async () => {
      user = await createTestUser();
      permission = await createTestServicePermission(user.id);

      // テスト失敗時にも残ったレコードをクリーンアップ
      onTestFinished(async () => {
        await prisma.user.deleteMany({ where: { id: user.id } });
      });
    });

    it("ユーザが DB から削除されること", async () => {
      await deleteUser(user.id);

      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      expect(dbUser).toBeNull();
    });

    it("関連する操作権限も CASCADE 削除されること", async () => {
      await deleteUser(user.id);

      const perm = await prisma.servicePermission.findUnique({
        where: { id: permission.id },
      });
      expect(perm).toBeNull();
    });
  });

  describe("存在しない ID を指定した場合", () => {
    let existingUser: User;

    beforeEach(async () => {
      existingUser = await createTestUser();

      onTestFinished(async () => {
        await prisma.user.deleteMany({ where: { id: existingUser.id } });
      });
    });

    it("エラーがスローされること", async () => {
      await expect(deleteUser("non-existent-id-xxxxxxxx")).rejects.toThrow();
    });

    it("エラー発生時、既存ユーザが削除されていないこと（不変条件）", async () => {
      await expect(deleteUser("non-existent-id-xxxxxxxx")).rejects.toThrow();

      const dbUser = await prisma.user.findUnique({ where: { id: existingUser.id } });
      expect(dbUser).not.toBeNull();
    });
  });
});

describe("addUserServicePermissions", () => {
  describe("操作権限を追加する場合", () => {
    let user: User;

    beforeEach(async () => {
      user = await createTestUser({ role: "Editor" });

      onTestFinished(async () => {
        await prisma.user.deleteMany({ where: { id: user.id } });
      });
    });

    it("指定した権限が DB に追加されること", async () => {
      const toAdd = [
        {
          clusterArn: "arn:aws:ecs:ap-northeast-1:123456789012:cluster/prod",
          clusterName: "prod",
          serviceArn: "arn:aws:ecs:ap-northeast-1:123456789012:service/prod/api",
          serviceName: "api",
        },
      ];

      await addUserServicePermissions(user.id, toAdd);

      const perms = await prisma.servicePermission.findMany({
        where: { userId: user.id },
      });
      expect(perms).toHaveLength(1);
      expect(perms[0].serviceName).toBe("api");
    });

    it("複数の権限を一度に追加できること", async () => {
      const toAdd = [
        {
          clusterArn: "arn:aws:ecs:ap-northeast-1:123456789012:cluster/prod",
          clusterName: "prod",
          serviceArn: "arn:aws:ecs:ap-northeast-1:123456789012:service/prod/api",
          serviceName: "api",
        },
        {
          clusterArn: "arn:aws:ecs:ap-northeast-1:123456789012:cluster/prod",
          clusterName: "prod",
          serviceArn: "arn:aws:ecs:ap-northeast-1:123456789012:service/prod/web",
          serviceName: "web",
        },
      ];

      await addUserServicePermissions(user.id, toAdd);

      const perms = await prisma.servicePermission.findMany({
        where: { userId: user.id },
      });
      expect(perms).toHaveLength(2);
    });
  });

  describe("重複した権限を追加する場合", () => {
    let user: User;
    const permData = {
      clusterArn: "arn:aws:ecs:ap-northeast-1:123456789012:cluster/prod",
      clusterName: "prod",
      serviceArn: "arn:aws:ecs:ap-northeast-1:123456789012:service/prod/api",
      serviceName: "api",
    };

    beforeEach(async () => {
      user = await createTestUser({ role: "Editor" });
      // 既に同じ権限が存在する状態を作る
      await prisma.servicePermission.create({
        data: { userId: user.id, ...permData },
      });

      onTestFinished(async () => {
        await prisma.user.deleteMany({ where: { id: user.id } });
      });
    });

    it("重複追加してもエラーにならないこと", async () => {
      await expect(
        addUserServicePermissions(user.id, [permData])
      ).resolves.not.toThrow();
    });

    it("同一サービスが重複して登録されないこと", async () => {
      await addUserServicePermissions(user.id, [permData]);

      const perms = await prisma.servicePermission.findMany({
        where: { userId: user.id, serviceArn: permData.serviceArn },
      });
      expect(perms).toHaveLength(1);
    });
  });
});

describe("removeUserServicePermissions", () => {
  describe("操作権限を削除する場合", () => {
    let user: User;
    let permA: ServicePermission;
    let permB: ServicePermission;
    let permC: ServicePermission;

    beforeEach(async () => {
      user = await createTestUser({ role: "Editor" });
      permA = await createTestServicePermission(user.id, {
        serviceArn: "arn:aws:ecs:ap-northeast-1:123456789012:service/prod/svc-a",
        serviceName: "svc-a",
      });
      permB = await createTestServicePermission(user.id, {
        serviceArn: "arn:aws:ecs:ap-northeast-1:123456789012:service/prod/svc-b",
        serviceName: "svc-b",
      });
      permC = await createTestServicePermission(user.id, {
        serviceArn: "arn:aws:ecs:ap-northeast-1:123456789012:service/prod/svc-c",
        serviceName: "svc-c",
      });

      onTestFinished(async () => {
        await prisma.user.deleteMany({ where: { id: user.id } });
      });
    });

    it("指定した権限が DB から削除されること", async () => {
      await removeUserServicePermissions(user.id, [permB.serviceArn]);

      const deleted = await prisma.servicePermission.findUnique({
        where: { id: permB.id },
      });
      expect(deleted).toBeNull();
    });

    it("複数の権限を一度に削除できること", async () => {
      await removeUserServicePermissions(user.id, [
        permA.serviceArn,
        permC.serviceArn,
      ]);

      const perms = await prisma.servicePermission.findMany({
        where: { userId: user.id },
      });
      expect(perms).toHaveLength(1);
      expect(perms[0].id).toBe(permB.id);
    });

    it("削除後も残るべき権限は変化しないこと", async () => {
      await removeUserServicePermissions(user.id, [permB.serviceArn]);

      const remaining = await prisma.servicePermission.findMany({
        where: { userId: user.id },
        orderBy: { serviceName: "asc" },
      });
      const remainingNames = remaining.map((p) => p.serviceName);
      expect(remainingNames).toContain(permA.serviceName);
      expect(remainingNames).toContain(permC.serviceName);
    });
  });

  describe("存在しない権限を指定した場合", () => {
    let user: User;
    let existingPerm: ServicePermission;

    beforeEach(async () => {
      user = await createTestUser({ role: "Editor" });
      existingPerm = await createTestServicePermission(user.id);

      onTestFinished(async () => {
        await prisma.user.deleteMany({ where: { id: user.id } });
      });
    });

    it("エラーにならないこと", async () => {
      await expect(
        removeUserServicePermissions(user.id, [
          "arn:aws:ecs:ap-northeast-1:123456789012:service/non/existent",
        ])
      ).resolves.not.toThrow();
    });

    it("存在する権限は削除されないこと（不変条件）", async () => {
      await removeUserServicePermissions(user.id, [
        "arn:aws:ecs:ap-northeast-1:123456789012:service/non/existent",
      ]);

      const perm = await prisma.servicePermission.findUnique({
        where: { id: existingPerm.id },
      });
      expect(perm).not.toBeNull();
    });
  });
});
