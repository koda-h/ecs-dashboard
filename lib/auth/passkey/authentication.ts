import { generateAuthenticationOptions } from "@simplewebauthn/server";
import type { PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/server";
import { prisma } from "@/lib/db";

const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5分

/**
 * Discoverable credentials（resident key）方式でパスキー認証オプションを生成する。
 * allowCredentials を渡さないことで OS のパスキーピッカーが起動し、
 * ユーザは loginId を入力せずにパスキーを選択できる。
 * ユーザの特定は verify 後に credentialId から行う。
 */
export async function generatePasskeyAuthenticationOptions(): Promise<PublicKeyCredentialRequestOptionsJSON> {
  const options = await generateAuthenticationOptions({
    rpID: process.env.RP_ID ?? "localhost",
  });

  await prisma.webAuthnChallenge.create({
    data: {
      challenge: options.challenge,
      type: "authentication",
      userId: null,
      expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
    },
  });

  return options;
}

/**
 * credentialId から User を特定してセッション発行用の情報を返す。
 * 戻り値は setSessionCookie(userId, role) に渡す形式に合わせる。
 * User.id（内部ID）は含まない。
 */
export async function findUserByCredentialId(credentialId: string): Promise<{
  userId: string;
  role: string;
}> {
  const passkey = await prisma.passkey.findUnique({
    where: { credentialId },
    select: {
      user: { select: { userId: true, role: true } },
    },
  });

  if (!passkey) throw new Error("Passkey not found");

  return {
    userId: passkey.user.userId,
    role: passkey.user.role,
  };
}

/**
 * 認証成功後に counter と lastUsedAt を更新する。
 * counter の検証は verifyAuthenticationResponse（SimpleWebAuthn）側で行う。
 */
export async function updatePasskeyAfterAuth(
  credentialId: string,
  newCounter: bigint
): Promise<void> {
  const passkey = await prisma.passkey.findUnique({ where: { credentialId } });
  if (!passkey) throw new Error("Passkey not found");

  await prisma.passkey.update({
    where: { credentialId },
    data: { counter: newCounter, lastUsedAt: new Date() },
  });
}
