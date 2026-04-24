import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";

/**
 * WebAuthn user handle として使う PII フリーのランダム値を生成する。
 * 32バイトのランダムデータを base64url エンコードして返す。
 * WebAuthn 仕様の user.id バイト長制約（最大64バイト）を満たす。
 */
export function generateWebAuthnUserId(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * User の webAuthnUserId を取得する。未設定なら生成して DB に保存して返す。
 * 複数デバイスのパスキー登録時に同じ user handle を再利用するため、
 * 一度生成した値は変更しない。
 */
export async function getOrCreateWebAuthnUserId(
  userInternalId: string
): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userInternalId },
    select: { webAuthnUserId: true },
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (user.webAuthnUserId) {
    return user.webAuthnUserId;
  }

  const webAuthnUserId = generateWebAuthnUserId();
  await prisma.user.update({
    where: { id: userInternalId },
    data: { webAuthnUserId },
  });

  return webAuthnUserId;
}
