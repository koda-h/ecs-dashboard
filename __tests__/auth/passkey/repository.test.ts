import { describe, it, expect, beforeEach, onTestFinished } from "vitest";
import { prisma } from "@/lib/db";
import { createTestUser } from "@/src/test-utils/db";
import { createTestPasskey } from "@/src/test-utils/passkey";
import {
  listPasskeys,
  deletePasskey,
  countPasskeys,
} from "@/lib/auth/passkey/repository";
import type { User, Passkey } from "@prisma/client";

// パスキーリポジトリ 仕様
//
// パスキー管理ページ（app/account/passkeys/page.tsx）からの操作を支える CRUD 関数。
//
// 【listPasskeys】
//   - 呼び出したユーザ自身のパスキー一覧を返す
//   - publicKey はクライアントに返さない（秘密情報の保護）
//   - 表示に必要な name, deviceType, backedUp, createdAt, lastUsedAt を含む
//
// 【deletePasskey】
//   - passkeyId と userInternalId（User.id）の両方を受け取り、所有権を検証してから削除する
//   - 他ユーザのパスキーは削除できない
//
// 【countPasskeys】
//   - ユーザが保有するパスキー件数を返す
//   - 登録オプション生成・storePasskey で上限チェックに使用する

describe("listPasskeys", () => {
  describe("正常系", () => {
    let user: User;
    let passkey: Passkey;

    beforeEach(async () => {
      user = await createTestUser();
      passkey = await createTestPasskey(user.id);
      onTestFinished(async () => {
        await prisma.passkey.deleteMany({ where: { userId: user.id } });
        await prisma.user.deleteMany({ where: { id: user.id } });
      });
    });

    it("ユーザの登録済みパスキー一覧が返されること", async () => {
      const result = await listPasskeys(user.id);

      expect(result).toHaveLength(1);
      expect(result[0].credentialId).toBe(passkey.credentialId);
    });

    it("返される各パスキーに name, credentialId, deviceType, backedUp, createdAt, lastUsedAt が含まれること", async () => {
      const result = await listPasskeys(user.id);

      expect(result[0]).toMatchObject({
        name: expect.any(String),
        credentialId: expect.any(String),
        deviceType: expect.any(String),
        backedUp: expect.any(Boolean),
        createdAt: expect.any(Date),
        lastUsedAt: null,
      });
    });

    it("一度も使用していないパスキーの lastUsedAt が null で返されること", async () => {
      const result = await listPasskeys(user.id);

      expect(result[0].lastUsedAt).toBeNull();
    });

    it("パスキーが0件のユーザに対して空配列が返されること", async () => {
      const emptyUser = await createTestUser();
      onTestFinished(async () => {
        await prisma.user.deleteMany({ where: { id: emptyUser.id } });
      });

      const result = await listPasskeys(emptyUser.id);

      expect(result).toHaveLength(0);
    });

    it("パスキーが複数件のユーザに対してすべてのパスキーが返されること", async () => {
      const passkey2 = await createTestPasskey(user.id);

      const result = await listPasskeys(user.id);

      expect(result).toHaveLength(2);
      const credentialIds = result.map((p) => p.credentialId);
      expect(credentialIds).toContain(passkey.credentialId);
      expect(credentialIds).toContain(passkey2.credentialId);
    });
  });

  describe("他ユーザのパスキーの分離", () => {
    let user: User;
    let otherUser: User;

    beforeEach(async () => {
      user = await createTestUser();
      otherUser = await createTestUser();
      await createTestPasskey(user.id);
      await createTestPasskey(otherUser.id);
      onTestFinished(async () => {
        await prisma.passkey.deleteMany({ where: { userId: user.id } });
        await prisma.passkey.deleteMany({ where: { userId: otherUser.id } });
        await prisma.user.deleteMany({ where: { id: user.id } });
        await prisma.user.deleteMany({ where: { id: otherUser.id } });
      });
    });

    it("他のユーザが登録したパスキーが一覧に含まれないこと", async () => {
      const result = await listPasskeys(user.id);

      const userIds = result.map((p) =>
        // DBから直接取得して userId を確認
        p.credentialId
      );
      // 取得されたパスキーがすべて user.id に属することを確認
      expect(result).toHaveLength(1);
      for (const p of result) {
        const record = await prisma.passkey.findUnique({
          where: { credentialId: p.credentialId },
          select: { userId: true },
        });
        expect(record?.userId).toBe(user.id);
      }
    });
  });

  describe("セキュリティ: publicKey の非公開", () => {
    let user: User;

    beforeEach(async () => {
      user = await createTestUser();
      await createTestPasskey(user.id);
      onTestFinished(async () => {
        await prisma.passkey.deleteMany({ where: { userId: user.id } });
        await prisma.user.deleteMany({ where: { id: user.id } });
      });
    });

    it("返されるパスキー情報に publicKey が含まれないこと", async () => {
      const result = await listPasskeys(user.id);

      expect(result[0]).not.toHaveProperty("publicKey");
    });
  });
});

describe("deletePasskey", () => {
  describe("正常系", () => {
    let user: User;
    let passkey: Passkey;

    beforeEach(async () => {
      user = await createTestUser();
      passkey = await createTestPasskey(user.id);
      onTestFinished(async () => {
        await prisma.passkey.deleteMany({ where: { userId: user.id } });
        await prisma.user.deleteMany({ where: { id: user.id } });
      });
    });

    it("自分のパスキーを削除すると DB からそのレコードが消えること", async () => {
      await deletePasskey(passkey.id, user.id);

      const record = await prisma.passkey.findUnique({ where: { id: passkey.id } });
      expect(record).toBeNull();
    });

    it("削除後に listPasskeys を呼ぶと削除したパスキーが含まれないこと", async () => {
      await deletePasskey(passkey.id, user.id);

      const result = await listPasskeys(user.id);
      const credentialIds = result.map((p) => p.credentialId);
      expect(credentialIds).not.toContain(passkey.credentialId);
    });

    it("削除対象以外のパスキーが DB に残ること", async () => {
      const otherPasskey = await createTestPasskey(user.id);

      await deletePasskey(passkey.id, user.id);

      const remaining = await prisma.passkey.findUnique({ where: { id: otherPasskey.id } });
      expect(remaining).not.toBeNull();
    });
  });

  describe("所有権の検証", () => {
    let user: User;
    let otherUser: User;
    let otherPasskey: Passkey;

    beforeEach(async () => {
      user = await createTestUser();
      otherUser = await createTestUser();
      otherPasskey = await createTestPasskey(otherUser.id);
      onTestFinished(async () => {
        await prisma.passkey.deleteMany({ where: { userId: user.id } });
        await prisma.passkey.deleteMany({ where: { userId: otherUser.id } });
        await prisma.user.deleteMany({ where: { id: user.id } });
        await prisma.user.deleteMany({ where: { id: otherUser.id } });
      });
    });

    it("他のユーザのパスキー ID を渡した場合はエラーになること", async () => {
      await expect(deletePasskey(otherPasskey.id, user.id)).rejects.toThrow();
    });

    it("他のユーザのパスキーを削除しようとしても DB が変化しないこと", async () => {
      await deletePasskey(otherPasskey.id, user.id).catch(() => {});

      const record = await prisma.passkey.findUnique({ where: { id: otherPasskey.id } });
      expect(record).not.toBeNull();
    });
  });

  describe("異常系", () => {
    let user: User;

    beforeEach(async () => {
      user = await createTestUser();
      onTestFinished(async () => {
        await prisma.user.deleteMany({ where: { id: user.id } });
      });
    });

    it("存在しない passkeyId を渡した場合はエラーになること", async () => {
      await expect(deletePasskey("non-existent-passkey-id", user.id)).rejects.toThrow();
    });
  });
});

describe("countPasskeys", () => {
  // 0件のときに誤った値が返らないことを確認する
  it("パスキーが0件のユーザに対して 0 が返されること", async () => {
    const user = await createTestUser();
    onTestFinished(async () => {
      await prisma.user.deleteMany({ where: { id: user.id } });
    });

    const count = await countPasskeys(user.id);

    expect(count).toBe(0);
  });

  // 複数件が正確にカウントされることを確認する
  it("パスキーが3件のユーザに対して 3 が返されること", async () => {
    const user = await createTestUser();
    await createTestPasskey(user.id);
    await createTestPasskey(user.id);
    await createTestPasskey(user.id);
    onTestFinished(async () => {
      await prisma.passkey.deleteMany({ where: { userId: user.id } });
      await prisma.user.deleteMany({ where: { id: user.id } });
    });

    const count = await countPasskeys(user.id);

    expect(count).toBe(3);
  });

  // 上限と一致する件数が正確に返されることを確認する（上限チェックの境界値）
  it("パスキーが5件（上限）のユーザに対して 5 が返されること", async () => {
    const user = await createTestUser();
    for (let i = 0; i < 5; i++) {
      await createTestPasskey(user.id);
    }
    onTestFinished(async () => {
      await prisma.passkey.deleteMany({ where: { userId: user.id } });
      await prisma.user.deleteMany({ where: { id: user.id } });
    });

    const count = await countPasskeys(user.id);

    expect(count).toBe(5);
  });

  // カウントが自分のパスキーのみを対象にしていることを確認する（他ユーザの分が混入しない）
  it("他のユーザのパスキーがカウントに含まれないこと", async () => {
    const user = await createTestUser();
    const otherUser = await createTestUser();
    await createTestPasskey(user.id);
    await createTestPasskey(otherUser.id);
    await createTestPasskey(otherUser.id);
    onTestFinished(async () => {
      await prisma.passkey.deleteMany({ where: { userId: user.id } });
      await prisma.passkey.deleteMany({ where: { userId: otherUser.id } });
      await prisma.user.deleteMany({ where: { id: user.id } });
      await prisma.user.deleteMany({ where: { id: otherUser.id } });
    });

    const count = await countPasskeys(user.id);

    expect(count).toBe(1);
  });
});
