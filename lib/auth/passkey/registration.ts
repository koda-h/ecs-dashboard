import { generateRegistrationOptions } from "@simplewebauthn/server";
import type {
  PublicKeyCredentialCreationOptionsJSON,
  AuthenticatorTransportFuture,
} from "@simplewebauthn/server";
import { prisma } from "@/lib/db";
import { getOrCreateWebAuthnUserId } from "./webauthn-user-id";
import { listPasskeys, countPasskeys, MAX_PASSKEYS_PER_USER } from "./repository";

const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5分
const MAX_PASSKEY_NAME_LENGTH = 100;

/**
 * パスキー登録オプションを生成する。
 * webAuthnUserId を user handle として使用する（userId / email は使わない）。
 * 既存パスキーを excludeCredentials に含め、同一デバイスの二重登録を防ぐ。
 * 上限（5件）に達している場合はエラー。
 */
export async function generatePasskeyRegistrationOptions(
  userInternalId: string
): Promise<PublicKeyCredentialCreationOptionsJSON> {
  const user = await prisma.user.findUnique({
    where: { id: userInternalId },
    select: { userId: true },
  });
  if (!user) throw new Error("User not found");

  const count = await countPasskeys(userInternalId);
  if (count >= MAX_PASSKEYS_PER_USER) throw new Error("Passkey limit reached");

  const webAuthnUserId = await getOrCreateWebAuthnUserId(userInternalId);
  const existingPasskeys = await listPasskeys(userInternalId);

  const options = await generateRegistrationOptions({
    rpName: process.env.RP_NAME ?? "ECS Dashboard",
    rpID: process.env.RP_ID ?? "localhost",
    userName: user.userId,
    userID: Buffer.from(webAuthnUserId, "base64url"),
    excludeCredentials: existingPasskeys.map((p) => ({
      id: p.credentialId,
      transports: p.transports as AuthenticatorTransportFuture[],
    })),
  });

  // SimpleWebAuthn が生成したチャレンジを DB に保存する
  await prisma.webAuthnChallenge.create({
    data: {
      challenge: options.challenge,
      type: "registration",
      userId: userInternalId,
      expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
    },
  });

  return options;
}

/**
 * verifyRegistrationResponse（SimpleWebAuthn）の検証結果を受け取り、
 * Passkey レコードを DB に保存する。
 * name: ユーザが入力した識別名（最大100文字、空白のみ不可）
 */
export async function storePasskey(
  userInternalId: string,
  name: string,
  data: {
    credentialId: string;
    publicKey: Uint8Array;
    counter: number;
    deviceType: string;
    backedUp: boolean;
    transports: string[];
  }
) {
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error("Passkey name is required");
  if (trimmedName.length > MAX_PASSKEY_NAME_LENGTH)
    throw new Error("Passkey name is too long");

  const count = await countPasskeys(userInternalId);
  if (count >= MAX_PASSKEYS_PER_USER) throw new Error("Passkey limit reached");

  return prisma.passkey.create({
    data: {
      userId: userInternalId,
      name: trimmedName,
      credentialId: data.credentialId,
      publicKey: Buffer.from(data.publicKey),
      counter: BigInt(data.counter),
      deviceType: data.deviceType,
      backedUp: data.backedUp,
      transports: data.transports,
    },
  });
}
