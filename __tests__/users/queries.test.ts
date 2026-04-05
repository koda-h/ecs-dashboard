import { describe, it, expect, beforeEach, onTestFinished } from "vitest";
import { prisma } from "@/lib/db";
import type { User } from "@prisma/client";
import { listUsers, getUserById } from "@/lib/users/queries";
import { createTestUser, createTestServicePermission } from "@/src/test-utils/db";

// ──────────────────────────────────────────────────────────────────
// listUsers / getUserById — DB 結合テスト
//
// 実際の DB を使用し、作成したテストデータが正しく取得できることを確認する。
// beforeEach でデータを作成し、onTestFinished で必ずクリーンアップする。
// ──────────────────────────────────────────────────────────────────

describe("listUsers", () => {
  describe("複数ロールのユーザが存在する場合", () => {
    let viewerUser: User;
    let adminUser: User;
    let editorUser: User;

    beforeEach(async () => {
      viewerUser = await createTestUser({ role: "Viewer" });
      adminUser = await createTestUser({ role: "Admin" });
      editorUser = await createTestUser({ role: "Editor" });
      // Editor ユーザに操作権限を1件付与
      await createTestServicePermission(editorUser.id);

      onTestFinished(async () => {
        await prisma.user.deleteMany({
          where: { id: { in: [viewerUser.id, adminUser.id, editorUser.id] } },
        });
      });
    });

    it("作成したユーザがすべて一覧に含まれること", async () => {
      const result = await listUsers();

      const ids = result.map((u) => u.id);
      expect(ids).toContain(viewerUser.id);
      expect(ids).toContain(adminUser.id);
      expect(ids).toContain(editorUser.id);
    });

    it("各ユーザの role が正しく返ること", async () => {
      const result = await listUsers();

      const foundViewer = result.find((u) => u.id === viewerUser.id);
      const foundAdmin = result.find((u) => u.id === adminUser.id);
      const foundEditor = result.find((u) => u.id === editorUser.id);

      expect(foundViewer?.role).toBe("Viewer");
      expect(foundAdmin?.role).toBe("Admin");
      expect(foundEditor?.role).toBe("Editor");
    });

    it("Editor ユーザの操作権限サービス一覧が含まれること", async () => {
      const result = await listUsers();

      const found = result.find((u) => u.id === editorUser.id);

      expect(found?.servicePermissions).toHaveLength(1);
      // serviceArn, serviceName, clusterArn, clusterName が含まれること
      expect(found?.servicePermissions[0].serviceArn).toBeDefined();
    });

    it("Viewer・Admin ユーザの操作権限サービス一覧は空であること", async () => {
      const result = await listUsers();

      const foundViewer = result.find((u) => u.id === viewerUser.id);
      const foundAdmin = result.find((u) => u.id === adminUser.id);

      expect(foundViewer?.servicePermissions).toHaveLength(0);
      expect(foundAdmin?.servicePermissions).toHaveLength(0);
    });

    it("createdAt, updatedAt が Date 型として含まれること", async () => {
      const result = await listUsers();

      const found = result.find((u) => u.id === viewerUser.id);

      expect(found?.createdAt).toBeInstanceOf(Date);
      expect(found?.updatedAt).toBeInstanceOf(Date);
    });

    it("userId, email が含まれること", async () => {
      const result = await listUsers();

      const found = result.find((u) => u.id === viewerUser.id);

      expect(found?.userId).toBe(viewerUser.userId);
      expect(found?.email).toBe(viewerUser.email);
    });
  });
});

describe("getUserById", () => {
  describe("指定した ID のユーザが存在する場合", () => {
    let user: User;

    beforeEach(async () => {
      user = await createTestUser({ role: "Editor" });
      await createTestServicePermission(user.id);

      onTestFinished(async () => {
        await prisma.user.deleteMany({ where: { id: user.id } });
      });
    });

    it("指定したユーザの詳細が返ること", async () => {
      const result = await getUserById(user.id);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(user.id);
      expect(result?.userId).toBe(user.userId);
      expect(result?.email).toBe(user.email);
    });

    it("ユーザの role が含まれること", async () => {
      const result = await getUserById(user.id);

      expect(result?.role).toBe("Editor");
    });

    it("操作権限サービス一覧が含まれること", async () => {
      const result = await getUserById(user.id);

      expect(result?.servicePermissions).toHaveLength(1);
    });
  });

  describe("指定した ID のユーザが存在しない場合", () => {
    it("null を返すこと", async () => {
      const result = await getUserById("non-existent-id-xxxxxxxx");

      expect(result).toBeNull();
    });
  });
});
