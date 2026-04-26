import { describe, it, expect, beforeEach, onTestFinished } from "vitest";
import { prisma } from "@/lib/db";
import { createTestUser } from "@/src/test-utils/db";
import {
  generateWebAuthnUserId,
  getOrCreateWebAuthnUserId,
} from "@/lib/auth/passkey/webauthn-user-id";
import type { User } from "@prisma/client";

// webAuthnUserId 仕様
//
// WebAuthn の登録・認証で使う "user handle" は PII（個人識別情報）を含んではならない。
// user.userId（表示用ID）や email をそのまま渡すと、
// 認証器が保存した credential とユーザアカウントが結び付けられるリスクがある。
//
// このモジュールは PII とは独立した base64url 形式のランダム値を生成・管理する。
// User.webAuthnUserId に保存し、登録時に初回生成、以降は再利用する。

describe("generateWebAuthnUserId", () => {
  it("生成された値が base64url 形式であること（+, /, = を含まないこと）", () => {
    const id = generateWebAuthnUserId();

    // base64url は [A-Za-z0-9\-_] のみ。標準 base64 の +, /, padding(=) を含まない。
    expect(id).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(id).not.toMatch(/[+/=]/);
  });

  it("生成された値が空文字でないこと", () => {
    const id = generateWebAuthnUserId();

    expect(id.length).toBeGreaterThan(0);
  });

  it("連続して呼び出した場合に毎回異なる値が生成されること", () => {
    const ids = Array.from({ length: 10 }, () => generateWebAuthnUserId());

    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(10);
  });

  it("生成された値が WebAuthn の user handle のバイト長制約（最大64バイト）を満たすこと", () => {
    const id = generateWebAuthnUserId();

    // base64url をデコードしてバイト長を確認
    const bytes = Buffer.from(id, "base64url");
    expect(bytes.length).toBeLessThanOrEqual(64);
    expect(bytes.length).toBeGreaterThan(0);
  });
});

describe("getOrCreateWebAuthnUserId", () => {
  describe("webAuthnUserId が未設定のユーザの場合", () => {
    let user: User;

    beforeEach(async () => {
      user = await createTestUser();
      onTestFinished(async () => {
        await prisma.user.deleteMany({ where: { id: user.id } });
      });
    });

    it("新しい webAuthnUserId が生成されて DB の User レコードに保存されること", async () => {
      await getOrCreateWebAuthnUserId(user.id);

      const updated = await prisma.user.findUnique({
        where: { id: user.id },
        select: { webAuthnUserId: true },
      });
      expect(updated?.webAuthnUserId).not.toBeNull();
    });

    it("生成して保存された値が base64url 形式であること", async () => {
      const result = await getOrCreateWebAuthnUserId(user.id);

      expect(result).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(result).not.toMatch(/[+/=]/);
    });

    it("戻り値として保存された webAuthnUserId が返されること", async () => {
      const result = await getOrCreateWebAuthnUserId(user.id);

      const updated = await prisma.user.findUnique({
        where: { id: user.id },
        select: { webAuthnUserId: true },
      });
      expect(result).toBe(updated?.webAuthnUserId);
    });
  });

  describe("webAuthnUserId が設定済みのユーザの場合", () => {
    let user: User;
    const existingWebAuthnUserId = generateWebAuthnUserId();

    beforeEach(async () => {
      user = await createTestUser();
      await prisma.user.update({
        where: { id: user.id },
        data: { webAuthnUserId: existingWebAuthnUserId },
      });
      onTestFinished(async () => {
        await prisma.user.deleteMany({ where: { id: user.id } });
      });
    });

    it("既存の webAuthnUserId がそのまま返されること", async () => {
      const result = await getOrCreateWebAuthnUserId(user.id);

      expect(result).toBe(existingWebAuthnUserId);
    });

    it("DB の webAuthnUserId フィールドが変更されないこと", async () => {
      await getOrCreateWebAuthnUserId(user.id);

      const updated = await prisma.user.findUnique({
        where: { id: user.id },
        select: { webAuthnUserId: true },
      });
      expect(updated?.webAuthnUserId).toBe(existingWebAuthnUserId);
    });

    it("同じユーザで2回呼び出しても同一の値が返されること", async () => {
      const first = await getOrCreateWebAuthnUserId(user.id);
      const second = await getOrCreateWebAuthnUserId(user.id);

      expect(first).toBe(second);
    });
  });

  describe("存在しないユーザの場合", () => {
    it("存在しない User.id を渡した場合はエラーになること", async () => {
      const nonExistentId = "non-existent-cuid-000000000000";

      await expect(
        getOrCreateWebAuthnUserId(nonExistentId)
      ).rejects.toThrow();
    });
  });
});
