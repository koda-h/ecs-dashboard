import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";

const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5分

/**
 * WebAuthn チャレンジを生成して DB に保存し、チャレンジ文字列を返す。
 * 登録用は userId（User.id）を紐付ける。認証用は userId: null で保存する。
 */
export async function createChallenge(
  type: "registration" | "authentication",
  userId?: string | null
): Promise<string> {
  const challenge = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);

  await prisma.webAuthnChallenge.create({
    data: {
      challenge,
      type,
      userId: userId ?? null,
      expiresAt,
    },
  });

  return challenge;
}

/**
 * チャレンジを消費する（検証して DB から削除する）。
 *
 * - 期限切れ: 削除してエラー
 * - type 不一致: 削除せずエラー（再試行できるよう保持する）
 * - 正常: 削除して userId を返す
 */
export async function consumeChallenge(
  challenge: string,
  type: "registration" | "authentication"
): Promise<{ userId: string | null }> {
  const record = await prisma.webAuthnChallenge.findUnique({
    where: { challenge },
  });

  if (!record) {
    throw new Error("Challenge not found");
  }

  // 期限切れのレコードは即削除してエラー
  if (record.expiresAt < new Date()) {
    await prisma.webAuthnChallenge.delete({ where: { challenge } });
    throw new Error("Challenge expired");
  }

  // type 不一致の場合はレコードを残してエラー
  if (record.type !== type) {
    throw new Error("Challenge type mismatch");
  }

  // 正常消費: 削除して userId を返す
  await prisma.webAuthnChallenge.delete({ where: { challenge } });
  return { userId: record.userId };
}
