/**
 * パスキー関連テスト向けのユーティリティ。
 * 実際の Prisma クライアントを使用して DB に直接データを作成する。
 * onTestFinished と組み合わせて使用し、テスト終了後に確実にクリーンアップすること。
 */
import { prisma } from "@/lib/db";
import type { Passkey, WebAuthnChallenge } from "@prisma/client";
import { randomBytes } from "node:crypto";

function generateTestSuffix(): string {
  return `${Date.now()}-${randomBytes(4).toString("hex")}`;
}

export type TestPasskeyOverrides = Partial<
  Pick<
    Passkey,
    | "name"
    | "credentialId"
    | "deviceType"
    | "backedUp"
    | "transports"
    | "counter"
    | "lastUsedAt"
  >
>;

/**
 * テスト用パスキーを DB に作成して返す。
 * userInternalId は User.id（内部ID）を指定する。
 */
export async function createTestPasskey(
  userInternalId: string,
  overrides: TestPasskeyOverrides = {}
): Promise<Passkey> {
  const suffix = generateTestSuffix();
  return prisma.passkey.create({
    data: {
      userId: userInternalId,
      name: `Test Passkey ${suffix}`,
      credentialId: `test-cred-${suffix}`,
      publicKey: Buffer.from(`test-pk-${suffix}`),
      counter: BigInt(0),
      deviceType: "singleDevice",
      backedUp: false,
      transports: ["internal"],
      ...overrides,
    },
  });
}

export type TestChallengeOverrides = Partial<
  Pick<WebAuthnChallenge, "userId" | "type" | "expiresAt">
>;

/**
 * テスト用 WebAuthnChallenge を DB に作成して返す。
 * デフォルトは type: "registration"、有効期限5分後。
 */
export async function createTestWebAuthnChallenge(
  challenge: string,
  overrides: TestChallengeOverrides = {}
): Promise<WebAuthnChallenge> {
  return prisma.webAuthnChallenge.create({
    data: {
      challenge,
      type: "registration",
      userId: null,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      ...overrides,
    },
  });
}

/** 有効期限切れの WebAuthnChallenge を作成する（期限切れテスト用） */
export async function createExpiredWebAuthnChallenge(
  challenge: string,
  overrides: TestChallengeOverrides = {}
): Promise<WebAuthnChallenge> {
  return createTestWebAuthnChallenge(challenge, {
    expiresAt: new Date(Date.now() - 1), // 1ms 前 = 期限切れ
    ...overrides,
  });
}
