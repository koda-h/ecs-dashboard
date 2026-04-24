import { describe, it, expect, beforeEach, onTestFinished } from "vitest";
import { prisma } from "@/lib/db";
import { createTestUser } from "@/src/test-utils/db";
import { createTestPasskey } from "@/src/test-utils/passkey";
import {
  generatePasskeyAuthenticationOptions,
  findUserByCredentialId,
  updatePasskeyAfterAuth,
} from "@/lib/auth/passkey/authentication";
import type { User, Passkey } from "@prisma/client";

// パスキー認証 仕様
//
// 認証フローは identifier-first 方式を採用する。
// ユーザが loginId（userId または email）を入力し、「パスキーでログイン」ボタンを押すと
// そのユーザに紐付いた allowCredentials を含むオプションを返す。
//
// 【generatePasskeyAuthenticationOptions】
//   - loginId で User を検索し、そのユーザの Passkey 一覧から allowCredentials を生成する
//   - ユーザが存在しない場合とパスキー未登録の場合は同一エラーを返す（ユーザ列挙防止）
//   - 生成したチャレンジを DB に保存する（type: "authentication", userId: null）
//   - AccountLock のチェックは行わない（パスワード試行とは独立している）
//
// 【findUserByCredentialId】
//   - 認証 verify 後に呼ばれ、credentialId から User を特定してセッション発行用の情報を返す
//   - 戻り値には user.userId（表示用ID）と role を含む
//   - 戻り値に User.id（内部ID）は含めない（setSessionCookie は userId を使うため）
//
// 【updatePasskeyAfterAuth】
//   - 認証成功後に counter と lastUsedAt を更新する
//   - counter はリプレイ攻撃検知のために SimpleWebAuthn が検証済みの値を DB に反映する

describe("generatePasskeyAuthenticationOptions", () => {
  describe("正常系", () => {
    let user: User;
    let passkey: Passkey;

    beforeEach(async () => {
      user = await createTestUser();
      passkey = await createTestPasskey(user.id);
      onTestFinished(async () => {
        await prisma.webAuthnChallenge.deleteMany({ where: { challenge: { startsWith: "" } } });
        await prisma.passkey.deleteMany({ where: { userId: user.id } });
        await prisma.user.deleteMany({ where: { id: user.id } });
      });
    });

    it("パスキーが登録済みのユーザの loginId を渡すと PublicKeyCredentialRequestOptionsJSON 形式のオプションが返されること", async () => {
      const options = await generatePasskeyAuthenticationOptions(user.userId);
      onTestFinished(async () => {
        await prisma.webAuthnChallenge.deleteMany({ where: { challenge: options.challenge } });
      });

      expect(options).toMatchObject({
        challenge: expect.any(String),
        allowCredentials: expect.any(Array),
        rpId: expect.any(String),
      });
    });

    it("返されたオプションの challenge が WebAuthnChallenge として DB に保存されること", async () => {
      const options = await generatePasskeyAuthenticationOptions(user.userId);
      onTestFinished(async () => {
        await prisma.webAuthnChallenge.deleteMany({ where: { challenge: options.challenge } });
      });

      const record = await prisma.webAuthnChallenge.findUnique({
        where: { challenge: options.challenge },
      });
      expect(record).not.toBeNull();
    });

    it("保存された WebAuthnChallenge の userId が null であること", async () => {
      const options = await generatePasskeyAuthenticationOptions(user.userId);
      onTestFinished(async () => {
        await prisma.webAuthnChallenge.deleteMany({ where: { challenge: options.challenge } });
      });

      const record = await prisma.webAuthnChallenge.findUnique({
        where: { challenge: options.challenge },
      });
      expect(record?.userId).toBeNull();
    });

    it("loginId として userId を渡した場合に正しいユーザのオプションが返されること", async () => {
      const options = await generatePasskeyAuthenticationOptions(user.userId);
      onTestFinished(async () => {
        await prisma.webAuthnChallenge.deleteMany({ where: { challenge: options.challenge } });
      });

      const credentialIds = options.allowCredentials?.map((c) => c.id) ?? [];
      expect(credentialIds).toContain(passkey.credentialId);
    });

    it("loginId として email を渡した場合に正しいユーザのオプションが返されること", async () => {
      const options = await generatePasskeyAuthenticationOptions(user.email);
      onTestFinished(async () => {
        await prisma.webAuthnChallenge.deleteMany({ where: { challenge: options.challenge } });
      });

      const credentialIds = options.allowCredentials?.map((c) => c.id) ?? [];
      expect(credentialIds).toContain(passkey.credentialId);
    });
  });

  describe("allowCredentials の構成", () => {
    let user: User;

    beforeEach(async () => {
      user = await createTestUser();
      onTestFinished(async () => {
        await prisma.passkey.deleteMany({ where: { userId: user.id } });
        await prisma.user.deleteMany({ where: { id: user.id } });
      });
    });

    it("パスキーが1件のユーザの場合、そのパスキーの credentialId が allowCredentials に含まれること", async () => {
      const passkey = await createTestPasskey(user.id);

      const options = await generatePasskeyAuthenticationOptions(user.userId);
      onTestFinished(async () => {
        await prisma.webAuthnChallenge.deleteMany({ where: { challenge: options.challenge } });
      });

      const credentialIds = options.allowCredentials?.map((c) => c.id) ?? [];
      expect(credentialIds).toContain(passkey.credentialId);
      expect(credentialIds).toHaveLength(1);
    });

    it("パスキーが複数件のユーザの場合、すべての credentialId が allowCredentials に含まれること", async () => {
      const passkey1 = await createTestPasskey(user.id);
      const passkey2 = await createTestPasskey(user.id);

      const options = await generatePasskeyAuthenticationOptions(user.userId);
      onTestFinished(async () => {
        await prisma.webAuthnChallenge.deleteMany({ where: { challenge: options.challenge } });
      });

      const credentialIds = options.allowCredentials?.map((c) => c.id) ?? [];
      expect(credentialIds).toContain(passkey1.credentialId);
      expect(credentialIds).toContain(passkey2.credentialId);
      expect(credentialIds).toHaveLength(2);
    });

    it("Passkey に transports が保存されている場合、allowCredentials の transports に反映されること", async () => {
      await createTestPasskey(user.id, { transports: ["internal", "hybrid"] });

      const options = await generatePasskeyAuthenticationOptions(user.userId);
      onTestFinished(async () => {
        await prisma.webAuthnChallenge.deleteMany({ where: { challenge: options.challenge } });
      });

      const cred = options.allowCredentials?.[0];
      expect(cred?.transports).toEqual(expect.arrayContaining(["internal", "hybrid"]));
    });
  });

  describe("ユーザ列挙防止", () => {
    it("存在しない loginId を渡した場合のエラーメッセージが「パスキーが見つかりません」であること", async () => {
      await expect(
        generatePasskeyAuthenticationOptions("non-existent-login-id")
      ).rejects.toThrow("パスキーが見つかりません");
    });

    it("パスキー未登録のユーザの loginId を渡した場合のエラーメッセージが「パスキーが見つかりません」であること", async () => {
      const user = await createTestUser();
      onTestFinished(async () => {
        await prisma.user.deleteMany({ where: { id: user.id } });
      });

      await expect(
        generatePasskeyAuthenticationOptions(user.userId)
      ).rejects.toThrow("パスキーが見つかりません");
    });

    it("存在しない loginId とパスキー未登録ユーザへのエラーレスポンス形式が同一であること", async () => {
      const user = await createTestUser();
      onTestFinished(async () => {
        await prisma.user.deleteMany({ where: { id: user.id } });
      });

      let nonExistentError: Error | undefined;
      let noPasskeyError: Error | undefined;

      try {
        await generatePasskeyAuthenticationOptions("non-existent-login-id");
      } catch (e) {
        nonExistentError = e as Error;
      }

      try {
        await generatePasskeyAuthenticationOptions(user.userId);
      } catch (e) {
        noPasskeyError = e as Error;
      }

      expect(nonExistentError?.message).toBe(noPasskeyError?.message);
    });

    it("存在しない loginId を渡した場合に WebAuthnChallenge が DB に保存されないこと", async () => {
      const beforeCount = await prisma.webAuthnChallenge.count();

      await generatePasskeyAuthenticationOptions("non-existent-login-id").catch(() => {});

      const afterCount = await prisma.webAuthnChallenge.count();
      expect(afterCount).toBe(beforeCount);
    });
  });

  describe("AccountLock との独立性", () => {
    let user: User;

    beforeEach(async () => {
      user = await createTestUser();
      await createTestPasskey(user.id);
      // AccountLock でロック状態にする
      await prisma.accountLock.create({
        data: {
          userId: user.id,
          failureCount: 5,
          lockedAt: new Date(),
        },
      });
      onTestFinished(async () => {
        await prisma.accountLock.deleteMany({ where: { userId: user.id } });
        await prisma.passkey.deleteMany({ where: { userId: user.id } });
        await prisma.user.deleteMany({ where: { id: user.id } });
      });
    });

    it("AccountLock でロック中のユーザの loginId を渡しても正常にオプションが返されること", async () => {
      const options = await generatePasskeyAuthenticationOptions(user.userId);
      onTestFinished(async () => {
        await prisma.webAuthnChallenge.deleteMany({ where: { challenge: options.challenge } });
      });

      expect(options).toMatchObject({
        challenge: expect.any(String),
        allowCredentials: expect.any(Array),
      });
    });
  });
});

describe("findUserByCredentialId", () => {
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

    it("登録済みの credentialId を渡すと対応するユーザ情報が返されること", async () => {
      const result = await findUserByCredentialId(passkey.credentialId);

      expect(result).not.toBeNull();
    });

    it("返されるユーザ情報に userId（表示用ID）が含まれること", async () => {
      const result = await findUserByCredentialId(passkey.credentialId);

      expect(result.userId).toBe(user.userId);
    });

    it("返されるユーザ情報に role が含まれること", async () => {
      const result = await findUserByCredentialId(passkey.credentialId);

      expect(result.role).toBe(user.role);
    });

    it("返されるユーザ情報に User.id（内部ID）が含まれないこと", async () => {
      const result = await findUserByCredentialId(passkey.credentialId);

      expect(result).not.toHaveProperty("id");
    });
  });

  describe("異常系", () => {
    it("存在しない credentialId を渡した場合はエラーになること", async () => {
      await expect(
        findUserByCredentialId("non-existent-credential-id")
      ).rejects.toThrow();
    });
  });
});

describe("updatePasskeyAfterAuth", () => {
  describe("正常系", () => {
    let user: User;
    let passkey: Passkey;

    beforeEach(async () => {
      user = await createTestUser();
      passkey = await createTestPasskey(user.id, { counter: BigInt(10) });
      onTestFinished(async () => {
        await prisma.passkey.deleteMany({ where: { userId: user.id } });
        await prisma.user.deleteMany({ where: { id: user.id } });
      });
    });

    it("認証成功後に指定した credentialId の counter が新しい値に更新されること", async () => {
      const newCounter = BigInt(11);

      await updatePasskeyAfterAuth(passkey.credentialId, newCounter);

      const updated = await prisma.passkey.findUnique({
        where: { credentialId: passkey.credentialId },
      });
      expect(updated?.counter).toBe(newCounter);
    });

    it("認証成功後に lastUsedAt が現在時刻に更新されること", async () => {
      const beforeMs = Date.now();

      await updatePasskeyAfterAuth(passkey.credentialId, BigInt(11));

      const updated = await prisma.passkey.findUnique({
        where: { credentialId: passkey.credentialId },
      });
      const lastUsedMs = updated?.lastUsedAt?.getTime() ?? 0;
      expect(lastUsedMs).toBeGreaterThanOrEqual(beforeMs - 1_000);
      expect(lastUsedMs).toBeLessThanOrEqual(Date.now() + 1_000);
    });

    it("他のパスキーレコードが変更されないこと", async () => {
      const otherPasskey = await createTestPasskey(user.id, { counter: BigInt(5) });

      await updatePasskeyAfterAuth(passkey.credentialId, BigInt(11));

      const unchanged = await prisma.passkey.findUnique({
        where: { credentialId: otherPasskey.credentialId },
      });
      expect(unchanged?.counter).toBe(BigInt(5));
      expect(unchanged?.lastUsedAt).toBeNull();
    });
  });

  describe("異常系", () => {
    it("存在しない credentialId を渡した場合はエラーになること", async () => {
      await expect(
        updatePasskeyAfterAuth("non-existent-credential-id", BigInt(1))
      ).rejects.toThrow();
    });
  });
});
