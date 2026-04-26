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
// 認証フローは discoverable credentials（resident key）方式を採用する。
// allowCredentials を渡さないことで OS のパスキーピッカーが起動し、
// ユーザは loginId を入力せずにパスキーを選択できる。
// ユーザの特定は verify 後に credentialId から行う。
//
// 【generatePasskeyAuthenticationOptions】
//   - 引数なし。allowCredentials は含めない。
//   - 生成したチャレンジを DB に保存する（type: "authentication", userId: null）
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
    it("引数なしで呼び出すと PublicKeyCredentialRequestOptionsJSON 形式のオプションが返されること", async () => {
      const options = await generatePasskeyAuthenticationOptions();
      onTestFinished(async () => {
        await prisma.webAuthnChallenge.deleteMany({ where: { challenge: options.challenge } });
      });

      expect(options).toMatchObject({
        challenge: expect.any(String),
        rpId: expect.any(String),
      });
    });

    it("返されたオプションの challenge が WebAuthnChallenge として DB に保存されること", async () => {
      const options = await generatePasskeyAuthenticationOptions();
      onTestFinished(async () => {
        await prisma.webAuthnChallenge.deleteMany({ where: { challenge: options.challenge } });
      });

      const record = await prisma.webAuthnChallenge.findUnique({
        where: { challenge: options.challenge },
      });
      expect(record).not.toBeNull();
    });

    it("保存された WebAuthnChallenge の userId が null であること", async () => {
      const options = await generatePasskeyAuthenticationOptions();
      onTestFinished(async () => {
        await prisma.webAuthnChallenge.deleteMany({ where: { challenge: options.challenge } });
      });

      const record = await prisma.webAuthnChallenge.findUnique({
        where: { challenge: options.challenge },
      });
      expect(record?.userId).toBeNull();
    });

    it("discoverable credentials 方式のため allowCredentials が空または未指定であること", async () => {
      const options = await generatePasskeyAuthenticationOptions();
      onTestFinished(async () => {
        await prisma.webAuthnChallenge.deleteMany({ where: { challenge: options.challenge } });
      });

      expect(options.allowCredentials ?? []).toHaveLength(0);
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
