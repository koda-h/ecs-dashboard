import { prisma } from "@/lib/db";
import type { Passkey } from "@prisma/client";

export const MAX_PASSKEYS_PER_USER = 5;

/** クライアントに返す Passkey のビュー（publicKey を含まない） */
export type PasskeyView = {
  id: string;
  name: string;
  credentialId: string;
  deviceType: string;
  backedUp: boolean;
  transports: string[];
  createdAt: Date;
  lastUsedAt: Date | null;
};

/** ユーザの登録済みパスキー一覧を返す（publicKey は含まない） */
export async function listPasskeys(
  userInternalId: string
): Promise<PasskeyView[]> {
  return prisma.passkey.findMany({
    where: { userId: userInternalId },
    select: {
      id: true,
      name: true,
      credentialId: true,
      deviceType: true,
      backedUp: true,
      transports: true,
      createdAt: true,
      lastUsedAt: true,
      // publicKey は意図的に除外
    },
    orderBy: { createdAt: "desc" },
  });
}

/** ユーザのパスキー件数を返す */
export async function countPasskeys(userInternalId: string): Promise<number> {
  return prisma.passkey.count({ where: { userId: userInternalId } });
}

/**
 * パスキーを削除する。
 * userInternalId（User.id）による所有権検証を行い、他ユーザのパスキーは削除できない。
 */
export async function deletePasskey(
  passkeyId: string,
  userInternalId: string
): Promise<void> {
  const passkey = await prisma.passkey.findUnique({
    where: { id: passkeyId },
    select: { userId: true },
  });

  if (!passkey) {
    throw new Error("Passkey not found");
  }

  if (passkey.userId !== userInternalId) {
    throw new Error("Unauthorized");
  }

  await prisma.passkey.delete({ where: { id: passkeyId } });
}
