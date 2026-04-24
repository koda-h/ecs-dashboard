import { generateAuthenticationOptions } from "@simplewebauthn/server";
import type {
  PublicKeyCredentialRequestOptionsJSON,
  AuthenticatorTransportFuture,
} from "@simplewebauthn/server";
import { prisma } from "@/lib/db";

const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5分

/**
 * identifier-first 方式でパスキー認証オプションを生成する。
 * loginId（userId または email）でユーザを検索し allowCredentials を構成する。
 *
 * ユーザ列挙防止:
 * - ユーザが存在しない場合
 * - パスキーが未登録の場合
 * どちらも同一のエラーメッセージを返す。
 *
 * AccountLock の対象外（パスワード試行ロックとは独立している）。
 */
export async function generatePasskeyAuthenticationOptions(
  loginId: string
): Promise<PublicKeyCredentialRequestOptionsJSON> {
  const user = await prisma.user.findFirst({
    where: { OR: [{ userId: loginId }, { email: loginId }] },
    select: {
      passkeys: {
        select: { credentialId: true, transports: true },
      },
    },
  });

  // ユーザ列挙防止: 不存在とパスキー未登録を同一エラーで返す
  if (!user || user.passkeys.length === 0) {
    throw new Error("パスキーが見つかりません");
  }

  const options = await generateAuthenticationOptions({
    rpID: process.env.RP_ID ?? "localhost",
    allowCredentials: user.passkeys.map((p) => ({
      id: p.credentialId,
      transports: p.transports as AuthenticatorTransportFuture[],
    })),
  });

  // チャレンジを DB に保存（userId: null — ユーザは verify で credentialId から特定する）
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
