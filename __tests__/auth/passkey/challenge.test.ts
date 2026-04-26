import { describe, it, expect, beforeEach, onTestFinished } from "vitest";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { createTestUser } from "@/src/test-utils/db";
import {
  createExpiredWebAuthnChallenge,
  createTestWebAuthnChallenge,
} from "@/src/test-utils/passkey";
import { createChallenge, consumeChallenge } from "@/lib/auth/passkey/challenge";
import type { User } from "@prisma/client";

// WebAuthnChallenge 仕様
//
// チャレンジはリプレイ攻撃を防ぐための使い捨てランダム値。
// 有効期限: 5分。使用後: 即削除。type 不一致: 削除しないでエラー。
// 登録用: userId（User.id）を紐付け。認証用: userId: null。

describe("createChallenge", () => {
  describe("登録用チャレンジ（type: registration）", () => {
    let user: User;

    beforeEach(async () => {
      user = await createTestUser();
      onTestFinished(async () => {
        await prisma.webAuthnChallenge.deleteMany({ where: { userId: user.id } });
        await prisma.user.deleteMany({ where: { id: user.id } });
      });
    });

    it("チャレンジレコードが DB に保存されること", async () => {
      const challenge = await createChallenge("registration", user.id);

      const record = await prisma.webAuthnChallenge.findUnique({ where: { challenge } });
      expect(record).not.toBeNull();
    });

    it("type が 'registration' で保存されること", async () => {
      const challenge = await createChallenge("registration", user.id);

      const record = await prisma.webAuthnChallenge.findUnique({ where: { challenge } });
      expect(record?.type).toBe("registration");
    });

    it("指定した userId が紐付けられて保存されること", async () => {
      const challenge = await createChallenge("registration", user.id);

      const record = await prisma.webAuthnChallenge.findUnique({ where: { challenge } });
      expect(record?.userId).toBe(user.id);
    });

    it("有効期限が現時刻から5分後に設定されること", async () => {
      const beforeMs = Date.now();
      const challenge = await createChallenge("registration", user.id);
      const afterMs = Date.now();

      const record = await prisma.webAuthnChallenge.findUnique({ where: { challenge } });
      const expiresMs = record!.expiresAt.getTime();

      // 5分 = 300_000ms を基準に ±1秒の誤差を許容する
      expect(expiresMs).toBeGreaterThanOrEqual(beforeMs + 300_000 - 1_000);
      expect(expiresMs).toBeLessThanOrEqual(afterMs + 300_000 + 1_000);
    });

    it("base64url 形式のチャレンジ文字列が返されること", async () => {
      const challenge = await createChallenge("registration", user.id);

      expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(challenge).not.toMatch(/[+/=]/);
    });

    it("連続して呼び出した場合に毎回異なるチャレンジ文字列が生成されること", async () => {
      const c1 = await createChallenge("registration", user.id);
      const c2 = await createChallenge("registration", user.id);

      expect(c1).not.toBe(c2);
    });
  });

  describe("認証用チャレンジ（type: authentication）", () => {
    let createdChallenge: string;

    beforeEach(async () => {
      onTestFinished(async () => {
        if (createdChallenge) {
          await prisma.webAuthnChallenge.deleteMany({
            where: { challenge: createdChallenge },
          });
        }
      });
    });

    it("チャレンジレコードが DB に保存されること", async () => {
      createdChallenge = await createChallenge("authentication");

      const record = await prisma.webAuthnChallenge.findUnique({
        where: { challenge: createdChallenge },
      });
      expect(record).not.toBeNull();
    });

    it("type が 'authentication' で保存されること", async () => {
      createdChallenge = await createChallenge("authentication");

      const record = await prisma.webAuthnChallenge.findUnique({
        where: { challenge: createdChallenge },
      });
      expect(record?.type).toBe("authentication");
    });

    it("userId が null で保存されること", async () => {
      createdChallenge = await createChallenge("authentication");

      const record = await prisma.webAuthnChallenge.findUnique({
        where: { challenge: createdChallenge },
      });
      expect(record?.userId).toBeNull();
    });

    it("有効期限が現時刻から5分後に設定されること", async () => {
      const beforeMs = Date.now();
      createdChallenge = await createChallenge("authentication");
      const afterMs = Date.now();

      const record = await prisma.webAuthnChallenge.findUnique({
        where: { challenge: createdChallenge },
      });
      const expiresMs = record!.expiresAt.getTime();

      expect(expiresMs).toBeGreaterThanOrEqual(beforeMs + 300_000 - 1_000);
      expect(expiresMs).toBeLessThanOrEqual(afterMs + 300_000 + 1_000);
    });
  });
});

describe("consumeChallenge", () => {
  describe("有効なチャレンジを消費する場合", () => {
    let user: User;

    beforeEach(async () => {
      user = await createTestUser();
      onTestFinished(async () => {
        await prisma.webAuthnChallenge.deleteMany({ where: { userId: user.id } });
        await prisma.user.deleteMany({ where: { id: user.id } });
      });
    });

    it("消費後にチャレンジレコードが DB から削除されること", async () => {
      const challenge = await createChallenge("registration", user.id);

      await consumeChallenge(challenge, "registration");

      const record = await prisma.webAuthnChallenge.findUnique({ where: { challenge } });
      expect(record).toBeNull();
    });

    it("登録用チャレンジを消費すると紐付けられた userId が返されること", async () => {
      const challenge = await createChallenge("registration", user.id);

      const result = await consumeChallenge(challenge, "registration");

      expect(result.userId).toBe(user.id);
    });

    it("認証用チャレンジを消費すると userId が null で返されること", async () => {
      const challenge = randomBytes(32).toString("base64url");
      await createTestWebAuthnChallenge(challenge, {
        type: "authentication",
        userId: null,
      });

      const result = await consumeChallenge(challenge, "authentication");

      expect(result.userId).toBeNull();
    });
  });

  describe("有効期限切れのチャレンジを消費しようとする場合", () => {
    it("有効期限切れのチャレンジを渡した場合はエラーになること", async () => {
      const challenge = randomBytes(32).toString("base64url");
      await createExpiredWebAuthnChallenge(challenge);

      await expect(consumeChallenge(challenge, "registration")).rejects.toThrow();
    });

    it("有効期限切れのチャレンジは消費試行と同時に DB から削除されること", async () => {
      const challenge = randomBytes(32).toString("base64url");
      await createExpiredWebAuthnChallenge(challenge);

      await consumeChallenge(challenge, "registration").catch(() => {});

      const record = await prisma.webAuthnChallenge.findUnique({ where: { challenge } });
      expect(record).toBeNull();
    });
  });

  describe("存在しないチャレンジを消費しようとする場合", () => {
    it("DB に存在しないチャレンジ文字列を渡した場合はエラーになること", async () => {
      const nonExistentChallenge = randomBytes(32).toString("base64url");

      await expect(
        consumeChallenge(nonExistentChallenge, "registration")
      ).rejects.toThrow();
    });
  });

  describe("type が一致しないチャレンジを消費しようとする場合", () => {
    let challenge: string;

    beforeEach(async () => {
      challenge = randomBytes(32).toString("base64url");
      await createTestWebAuthnChallenge(challenge, { type: "registration" });
      onTestFinished(async () => {
        await prisma.webAuthnChallenge.deleteMany({ where: { challenge } });
      });
    });

    it("登録用チャレンジを 'authentication' type として消費しようとするとエラーになること", async () => {
      await expect(
        consumeChallenge(challenge, "authentication")
      ).rejects.toThrow();
    });

    it("type が一致しない場合にチャレンジレコードが DB に残ったままであること", async () => {
      await consumeChallenge(challenge, "authentication").catch(() => {});

      const record = await prisma.webAuthnChallenge.findUnique({ where: { challenge } });
      expect(record).not.toBeNull();
    });
  });

  describe("認証用チャレンジを登録用として消費しようとする場合", () => {
    let challenge: string;

    beforeEach(async () => {
      challenge = randomBytes(32).toString("base64url");
      await createTestWebAuthnChallenge(challenge, { type: "authentication" });
      onTestFinished(async () => {
        await prisma.webAuthnChallenge.deleteMany({ where: { challenge } });
      });
    });

    it("認証用チャレンジを 'registration' type として消費しようとするとエラーになること", async () => {
      await expect(
        consumeChallenge(challenge, "registration")
      ).rejects.toThrow();
    });
  });

  describe("同じチャレンジを2回消費しようとする場合（二重消費の防止）", () => {
    let user: User;

    beforeEach(async () => {
      user = await createTestUser();
      onTestFinished(async () => {
        await prisma.webAuthnChallenge.deleteMany({ where: { userId: user.id } });
        await prisma.user.deleteMany({ where: { id: user.id } });
      });
    });

    it("1回目の消費は成功し、2回目の消費はエラーになること", async () => {
      const challenge = await createChallenge("registration", user.id);

      // 1回目は成功する
      await expect(
        consumeChallenge(challenge, "registration")
      ).resolves.not.toThrow();

      // 2回目は「存在しない」扱いでエラー
      await expect(
        consumeChallenge(challenge, "registration")
      ).rejects.toThrow();
    });
  });
});
