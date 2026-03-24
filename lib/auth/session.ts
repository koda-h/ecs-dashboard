import { SignJWT, jwtVerify } from "jose";
import { randomUUID } from "crypto";

const EXPIRATION = "24h";
const EXPIRATION_SECONDS = 24 * 60 * 60;

export interface SessionPayload {
  userId: string;
  jti?: string;
  iat?: number;
  exp?: number;
}

function getSecret(): Uint8Array {
  const secret =
    process.env.JWT_SECRET ?? "dev-secret-key-at-least-32-chars!!";
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(userId: string): Promise<string> {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(EXPIRATION)
    .setJti(randomUUID())
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload> {
  const { payload } = await jwtVerify(token, getSecret());
  return payload as SessionPayload;
}

/** 有効なトークンを受け取り、有効期限を現時刻から24時間後に更新した新しいトークンを返す */
export async function refreshSessionToken(token: string): Promise<string> {
  const payload = await verifySessionToken(token);
  return createSessionToken(payload.userId);
}

/** トークンの有効性を確認し、認証済みかどうかを返す */
export async function checkAuthentication(
  token: string | null | undefined
): Promise<boolean> {
  if (!token) return false;
  try {
    await verifySessionToken(token);
    return true;
  } catch {
    return false;
  }
}

export { EXPIRATION_SECONDS };
