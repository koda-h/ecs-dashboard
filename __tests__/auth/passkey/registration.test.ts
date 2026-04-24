import { describe, it, expect, beforeEach, onTestFinished } from "vitest";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { createTestUser } from "@/src/test-utils/db";
import { createTestPasskey } from "@/src/test-utils/passkey";
import {
  generatePasskeyRegistrationOptions,
  storePasskey,
} from "@/lib/auth/passkey/registration";
import type { User } from "@prisma/client";

// RP_ID を localhost に固定（テスト環境用）
process.env.RP_ID = "localhost";

// パスキー登録 仕様
//
// 登録はセッション済みユーザのみが行える（route 層で認証チェック済みの前提）。
// 1ユーザあたりの登録上限は5件。上限に達している場合はオプション生成を拒否する。
// storePasskey は verifyRegistrationResponse（SimpleWebAuthn）の検証後に呼ぶ。

describe("generatePasskeyRegistrationOptions", () => {
  describe("正常系", () => {
    let user: User;

    beforeEach(async () => {
      user = await createTestUser();
      onTestFinished(async () => {
        await prisma.webAuthnChallenge.deleteMany({ where: { userId: user.id } });
        await prisma.passkey.deleteMany({ where: { userId: user.id } });
        await prisma.user.deleteMany({ where: { id: user.id } });
      });
    });

    it("PublicKeyCredentialCreationOptionsJSON 形式のオプションが返されること", async () => {
      const options = await generatePasskeyRegistrationOptions(user.id);

      // SimpleWebAuthn が返す必須フィールドの存在を確認する
      expect(options.challenge).toBeDefined();
      expect(options.rp).toBeDefined();
      expect(options.user).toBeDefined();
      expect(options.pubKeyCredParams).toBeDefined();
    });

    it("返されたオプションの challenge が WebAuthnChallenge として DB に保存されること", async () => {
      const options = await generatePasskeyRegistrationOptions(user.id);

      const record = await prisma.webAuthnChallenge.findUnique({
        where: { challenge: options.challenge },
      });
      expect(record).not.toBeNull();
      expect(record?.type).toBe("registration");
      expect(record?.userId).toBe(user.id);
    });

    it("オプションの rp.id が環境変数 RP_ID と一致すること", async () => {
      const options = await generatePasskeyRegistrationOptions(user.id);

      expect(options.rp.id).toBe(process.env.RP_ID);
    });

    it("webAuthnUserId が未設定のユーザに対して呼ぶと webAuthnUserId が生成されて DB に保存されること", async () => {
      // user は webAuthnUserId 未設定
      expect(
        (await prisma.user.findUnique({ where: { id: user.id }, select: { webAuthnUserId: true } }))
          ?.webAuthnUserId
      ).toBeNull();

      await generatePasskeyRegistrationOptions(user.id);

      const updated = await prisma.user.findUnique({
        where: { id: user.id },
        select: { webAuthnUserId: true },
      });
      expect(updated?.webAuthnUserId).not.toBeNull();
    });

    it("webAuthnUserId が設定済みのユーザに対して呼ぶと既存の webAuthnUserId が使われること", async () => {
      // 事前に webAuthnUserId を設定する
      const existingId = randomBytes(32).toString("base64url");
      await prisma.user.update({
        where: { id: user.id },
        data: { webAuthnUserId: existingId },
      });

      await generatePasskeyRegistrationOptions(user.id);

      const updated = await prisma.user.findUnique({
        where: { id: user.id },
        select: { webAuthnUserId: true },
      });
      expect(updated?.webAuthnUserId).toBe(existingId);
    });

    it("オプションの user.id が webAuthnUserId であり userId や email でないこと", async () => {
      const options = await generatePasskeyRegistrationOptions(user.id);

      const updated = await prisma.user.findUnique({
        where: { id: user.id },
        select: { webAuthnUserId: true, userId: true, email: true },
      });
      // options.user.id は webAuthnUserId と一致する
      expect(options.user.id).toBe(updated?.webAuthnUserId);
      // userId や email ではない
      expect(options.user.id).not.toBe(updated?.userId);
      expect(options.user.id).not.toBe(updated?.email);
    });

    it("パスキーが0件のユーザに対して正常にオプションが返されること", async () => {
      const options = await generatePasskeyRegistrationOptions(user.id);

      expect(options).toBeDefined();
    });

    it("パスキーが4件のユーザに対して正常にオプションが返されること", async () => {
      for (let i = 0; i < 4; i++) {
        await createTestPasskey(user.id);
      }

      const options = await generatePasskeyRegistrationOptions(user.id);

      expect(options).toBeDefined();
    });
  });

  describe("excludeCredentials による二重登録防止", () => {
    let user: User;

    beforeEach(async () => {
      user = await createTestUser();
      onTestFinished(async () => {
        await prisma.webAuthnChallenge.deleteMany({ where: { userId: user.id } });
        await prisma.passkey.deleteMany({ where: { userId: user.id } });
        await prisma.user.deleteMany({ where: { id: user.id } });
      });
    });

    it("すでに登録済みのパスキーの credentialId が excludeCredentials に含まれること", async () => {
      const existing = await createTestPasskey(user.id);

      const options = await generatePasskeyRegistrationOptions(user.id);

      const excludedIds = options.excludeCredentials?.map((c) => c.id) ?? [];
      expect(excludedIds).toContain(existing.credentialId);
    });

    it("パスキーが0件の場合は excludeCredentials が空配列であること", async () => {
      const options = await generatePasskeyRegistrationOptions(user.id);

      expect(options.excludeCredentials).toEqual([]);
    });
  });

  describe("パスキー上限（5件）", () => {
    let user: User;

    beforeEach(async () => {
      user = await createTestUser();
      for (let i = 0; i < 5; i++) {
        await createTestPasskey(user.id);
      }
      onTestFinished(async () => {
        await prisma.passkey.deleteMany({ where: { userId: user.id } });
        await prisma.user.deleteMany({ where: { id: user.id } });
      });
    });

    it("パスキーが5件のユーザに対してオプション生成を呼ぶとエラーになること", async () => {
      await expect(
        generatePasskeyRegistrationOptions(user.id)
      ).rejects.toThrow();
    });

    it("上限超過エラーの場合に WebAuthnChallenge が DB に保存されていないこと", async () => {
      const countBefore = await prisma.webAuthnChallenge.count({
        where: { userId: user.id },
      });

      await generatePasskeyRegistrationOptions(user.id).catch(() => {});

      const countAfter = await prisma.webAuthnChallenge.count({
        where: { userId: user.id },
      });
      expect(countAfter).toBe(countBefore);
    });
  });

  describe("存在しないユーザの場合", () => {
    it("存在しない User.id を渡した場合はエラーになること", async () => {
      await expect(
        generatePasskeyRegistrationOptions("non-existent-cuid-000000000000")
      ).rejects.toThrow();
    });
  });
});

describe("storePasskey", () => {
  describe("正常系", () => {
    let user: User;
    const testData = {
      credentialId: `cred-${randomBytes(8).toString("hex")}`,
      publicKey: new Uint8Array([1, 2, 3, 4]),
      counter: 0,
      deviceType: "singleDevice",
      backedUp: false,
      transports: ["internal"],
    };

    beforeEach(async () => {
      user = await createTestUser();
      onTestFinished(async () => {
        await prisma.passkey.deleteMany({ where: { userId: user.id } });
        await prisma.user.deleteMany({ where: { id: user.id } });
      });
    });

    it("Passkey レコードが DB に保存されること", async () => {
      const data = { ...testData, credentialId: `cred-${randomBytes(8).toString("hex")}` };

      await storePasskey(user.id, "My Passkey", data);

      const record = await prisma.passkey.findUnique({
        where: { credentialId: data.credentialId },
      });
      expect(record).not.toBeNull();
    });

    it("指定した name が保存されること", async () => {
      const data = { ...testData, credentialId: `cred-${randomBytes(8).toString("hex")}` };

      await storePasskey(user.id, "iPhone Face ID", data);

      const record = await prisma.passkey.findUnique({
        where: { credentialId: data.credentialId },
      });
      expect(record?.name).toBe("iPhone Face ID");
    });

    it("credentialId が正しく保存されること", async () => {
      const data = { ...testData, credentialId: `cred-${randomBytes(8).toString("hex")}` };

      await storePasskey(user.id, "My Passkey", data);

      const record = await prisma.passkey.findUnique({
        where: { credentialId: data.credentialId },
      });
      expect(record?.credentialId).toBe(data.credentialId);
    });

    it("publicKey が正しく保存されること", async () => {
      const data = {
        ...testData,
        credentialId: `cred-${randomBytes(8).toString("hex")}`,
        publicKey: new Uint8Array([10, 20, 30]),
      };

      await storePasskey(user.id, "My Passkey", data);

      const record = await prisma.passkey.findUnique({
        where: { credentialId: data.credentialId },
      });
      expect(Buffer.from(record!.publicKey)).toEqual(Buffer.from(data.publicKey));
    });

    it("counter の初期値が検証結果の counter 値で保存されること", async () => {
      const data = {
        ...testData,
        credentialId: `cred-${randomBytes(8).toString("hex")}`,
        counter: 42,
      };

      await storePasskey(user.id, "My Passkey", data);

      const record = await prisma.passkey.findUnique({
        where: { credentialId: data.credentialId },
      });
      expect(record?.counter).toBe(BigInt(42));
    });

    it("deviceType が保存されること", async () => {
      const data = {
        ...testData,
        credentialId: `cred-${randomBytes(8).toString("hex")}`,
        deviceType: "multiDevice",
      };

      await storePasskey(user.id, "My Passkey", data);

      const record = await prisma.passkey.findUnique({
        where: { credentialId: data.credentialId },
      });
      expect(record?.deviceType).toBe("multiDevice");
    });

    it("backedUp の値が保存されること", async () => {
      const data = {
        ...testData,
        credentialId: `cred-${randomBytes(8).toString("hex")}`,
        backedUp: true,
      };

      await storePasskey(user.id, "My Passkey", data);

      const record = await prisma.passkey.findUnique({
        where: { credentialId: data.credentialId },
      });
      expect(record?.backedUp).toBe(true);
    });

    it("transports が保存されること", async () => {
      const data = {
        ...testData,
        credentialId: `cred-${randomBytes(8).toString("hex")}`,
        transports: ["internal", "usb"],
      };

      await storePasskey(user.id, "My Passkey", data);

      const record = await prisma.passkey.findUnique({
        where: { credentialId: data.credentialId },
      });
      expect(record?.transports).toEqual(["internal", "usb"]);
    });

    it("lastUsedAt が null で保存されること", async () => {
      const data = { ...testData, credentialId: `cred-${randomBytes(8).toString("hex")}` };

      await storePasskey(user.id, "My Passkey", data);

      const record = await prisma.passkey.findUnique({
        where: { credentialId: data.credentialId },
      });
      expect(record?.lastUsedAt).toBeNull();
    });

    it("指定した User.id（内部FK）で正しく紐付けられること", async () => {
      const data = { ...testData, credentialId: `cred-${randomBytes(8).toString("hex")}` };

      await storePasskey(user.id, "My Passkey", data);

      const record = await prisma.passkey.findUnique({
        where: { credentialId: data.credentialId },
      });
      expect(record?.userId).toBe(user.id);
    });
  });

  describe("name バリデーション", () => {
    let user: User;

    beforeEach(async () => {
      user = await createTestUser();
      onTestFinished(async () => {
        await prisma.passkey.deleteMany({ where: { userId: user.id } });
        await prisma.user.deleteMany({ where: { id: user.id } });
      });
    });

    it("name が空文字の場合はエラーになること", async () => {
      const data = {
        credentialId: `cred-${randomBytes(8).toString("hex")}`,
        publicKey: new Uint8Array([1]),
        counter: 0,
        deviceType: "singleDevice",
        backedUp: false,
        transports: [],
      };

      await expect(storePasskey(user.id, "", data)).rejects.toThrow();

      // DB に保存されていないこと
      const record = await prisma.passkey.findUnique({
        where: { credentialId: data.credentialId },
      });
      expect(record).toBeNull();
    });

    it("name が上限文字数を超える場合はエラーになること", async () => {
      const tooLongName = "a".repeat(101); // 上限 100 文字を超える
      const data = {
        credentialId: `cred-${randomBytes(8).toString("hex")}`,
        publicKey: new Uint8Array([1]),
        counter: 0,
        deviceType: "singleDevice",
        backedUp: false,
        transports: [],
      };

      await expect(storePasskey(user.id, tooLongName, data)).rejects.toThrow();

      const record = await prisma.passkey.findUnique({
        where: { credentialId: data.credentialId },
      });
      expect(record).toBeNull();
    });

    it("name がスペースのみの場合はエラーになること", async () => {
      const data = {
        credentialId: `cred-${randomBytes(8).toString("hex")}`,
        publicKey: new Uint8Array([1]),
        counter: 0,
        deviceType: "singleDevice",
        backedUp: false,
        transports: [],
      };

      await expect(storePasskey(user.id, "   ", data)).rejects.toThrow();

      const record = await prisma.passkey.findUnique({
        where: { credentialId: data.credentialId },
      });
      expect(record).toBeNull();
    });
  });

  describe("credentialId の一意性", () => {
    let user: User;
    let existingPasskey: Awaited<ReturnType<typeof createTestPasskey>>;

    beforeEach(async () => {
      user = await createTestUser();
      existingPasskey = await createTestPasskey(user.id);
      onTestFinished(async () => {
        await prisma.passkey.deleteMany({ where: { userId: user.id } });
        await prisma.user.deleteMany({ where: { id: user.id } });
      });
    });

    it("すでに登録済みの credentialId を渡した場合はエラーになること", async () => {
      const data = {
        credentialId: existingPasskey.credentialId, // 既存と同じ
        publicKey: new Uint8Array([1]),
        counter: 0,
        deviceType: "singleDevice",
        backedUp: false,
        transports: [],
      };

      await expect(storePasskey(user.id, "Duplicate", data)).rejects.toThrow();
    });

    it("二重登録エラー時に既存の Passkey レコードが変更されていないこと", async () => {
      const data = {
        credentialId: existingPasskey.credentialId,
        publicKey: new Uint8Array([99]),
        counter: 999,
        deviceType: "multiDevice",
        backedUp: true,
        transports: [],
      };

      await storePasskey(user.id, "Duplicate", data).catch(() => {});

      // 既存のレコードが変更されていないこと
      const record = await prisma.passkey.findUnique({
        where: { credentialId: existingPasskey.credentialId },
      });
      expect(record?.name).toBe(existingPasskey.name);
      expect(record?.counter).toBe(existingPasskey.counter);
    });
  });

  describe("パスキー上限の整合性", () => {
    let user: User;

    beforeEach(async () => {
      user = await createTestUser();
      for (let i = 0; i < 5; i++) {
        await createTestPasskey(user.id);
      }
      onTestFinished(async () => {
        await prisma.passkey.deleteMany({ where: { userId: user.id } });
        await prisma.user.deleteMany({ where: { id: user.id } });
      });
    });

    it("すでにパスキーが5件の状態で storePasskey を呼ぶとエラーになること", async () => {
      const data = {
        credentialId: `cred-${randomBytes(8).toString("hex")}`,
        publicKey: new Uint8Array([1]),
        counter: 0,
        deviceType: "singleDevice",
        backedUp: false,
        transports: [],
      };

      await expect(storePasskey(user.id, "6th Passkey", data)).rejects.toThrow();
    });

    it("上限超過エラー時に Passkey レコードが DB に追加されていないこと", async () => {
      const countBefore = await prisma.passkey.count({ where: { userId: user.id } });
      const data = {
        credentialId: `cred-${randomBytes(8).toString("hex")}`,
        publicKey: new Uint8Array([1]),
        counter: 0,
        deviceType: "singleDevice",
        backedUp: false,
        transports: [],
      };

      await storePasskey(user.id, "6th Passkey", data).catch(() => {});

      const countAfter = await prisma.passkey.count({ where: { userId: user.id } });
      expect(countAfter).toBe(countBefore);
    });
  });
});
