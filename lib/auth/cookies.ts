import "server-only";
import { cookies } from "next/headers";
import { createSessionToken, verifySessionToken, SessionPayload } from "./session";

export const SESSION_COOKIE_NAME = "session";
const SESSION_MAX_AGE = 24 * 60 * 60; // 24時間（秒）

/** ユーザIDからセッションCookieを生成してセットする */
export async function setSessionCookie(userId: string): Promise<void> {
  const token = await createSessionToken(userId);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

/** Cookieからセッションを取得して検証する。無効な場合は null を返す */
export async function getSessionFromCookie(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

/** セッションCookieを削除する（ログアウト用） */
export async function deleteSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
