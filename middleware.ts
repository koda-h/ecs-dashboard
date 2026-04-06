import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, createSessionToken } from "@/lib/auth/session";
import { getRedirectDecisionWithRole } from "@/lib/auth/guard";
import type { UserRole } from "@/lib/users/role";

const SESSION_COOKIE_NAME = "session";
const SESSION_MAX_AGE = 24 * 60 * 60; // 24時間（秒）

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  // セッショントークンを検証する（Edge 互換の jose を使用）
  let userId: string | null = null;
  let userRole: UserRole | null = null;
  if (token) {
    try {
      const payload = await verifySessionToken(token);
      userId = payload.userId;
      userRole = payload.role ?? null;
    } catch {
      // 無効なトークン → 未認証として扱う
    }
  }

  const isAuthenticated = userId !== null;
  const decision = getRedirectDecisionWithRole(pathname, isAuthenticated, userRole);

  if (decision.redirect) {
    return NextResponse.redirect(new URL(decision.to, request.url));
  }

  const response = NextResponse.next();

  // スライディングセッション: 認証済みリクエストのたびに有効期限を24時間後にリセット
  // Server Action リクエスト（Next-Action ヘッダーあり）はスキップ
  // → ログアウト等のアクションによる Cookie 削除をミドルウェアが上書きしないようにする
  const isServerAction = request.headers.has("next-action");
  if (isAuthenticated && userId && userRole && !isServerAction) {
    const newToken = await createSessionToken(userId, userRole);
    response.cookies.set(SESSION_COOKIE_NAME, newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE,
      path: "/",
    });
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * 以下を除くすべてのパスにマッチする:
     * - api ルート
     * - Next.js 静的ファイル (_next/static, _next/image)
     * - favicon.ico
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
