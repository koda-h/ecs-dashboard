import { SignJWT } from "jose";
import { AccountLockState, LOCK_THRESHOLD } from "@/lib/auth/account-lock";
import { createSessionToken } from "@/lib/auth/session";

function getTestSecret(): Uint8Array {
  const secret =
    process.env.JWT_SECRET ?? "dev-secret-key-at-least-32-chars!!";
  return new TextEncoder().encode(secret);
}

/** 有効期限切れのセッショントークンを生成する */
export async function createExpiredToken(userId: string): Promise<string> {
  const now = Date.now();
  const issuedAt = Math.floor((now - 26 * 3600 * 1000) / 1000); // 26時間前
  const expiredAt = Math.floor((now - 2 * 3600 * 1000) / 1000); // 2時間前(期限切れ)

  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(issuedAt)
    .setExpirationTime(expiredAt)
    .sign(getTestSecret());
}

/** ペイロードを改ざんした（署名が不一致の）トークンを生成する */
export async function createTamperedToken(userId: string): Promise<string> {
  const validToken = await createSessionToken(userId);
  const parts = validToken.split(".");

  // ペイロード部分を改ざん（別ユーザIDに置き換え）
  const originalPayload = JSON.parse(
    Buffer.from(parts[1], "base64url").toString("utf-8")
  );
  const tamperedPayload = { ...originalPayload, userId: "tampered-user" };
  const tamperedPayloadEncoded = Buffer.from(
    JSON.stringify(tamperedPayload)
  ).toString("base64url");

  // 元の署名はそのまま（ペイロードが変わったので署名検証は失敗する）
  return `${parts[0]}.${tamperedPayloadEncoded}.${parts[2]}`;
}

/** ロック直前（失敗4回）の AccountLockState を生成する */
export function createAlmostLockedState(): AccountLockState {
  return { failureCount: LOCK_THRESHOLD - 1, lockedAt: null };
}

/** ロック済み AccountLockState を生成する */
export function createLockedState(lockedAt: Date = new Date()): AccountLockState {
  return { failureCount: LOCK_THRESHOLD, lockedAt };
}

/** ロック解除済みの AccountLockState（30秒以上前にロック）を生成する */
export function createExpiredLockState(): AccountLockState {
  const lockedAt = new Date(Date.now() - 31_000); // 31秒前
  return { failureCount: LOCK_THRESHOLD, lockedAt };
}
