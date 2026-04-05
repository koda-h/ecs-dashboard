import type { UserRole } from "@/lib/users/role";

// 認証不要で誰でもアクセスできるルート
const PUBLIC_ROUTES = ["/login", "/register", "/password-reset"];

// 認証済みユーザが訪問した場合、サービス一覧へリダイレクトするルート
const PUBLIC_ONLY_ROUTES = ["/login", "/register"];

export function isPublicOnlyRoute(pathname: string): boolean {
  return PUBLIC_ONLY_ROUTES.includes(pathname);
}

export function isProtectedRoute(pathname: string): boolean {
  return !PUBLIC_ROUTES.includes(pathname);
}

export type RedirectDecision =
  | { redirect: true; to: string }
  | { redirect: false };

/**
 * パス名と認証状態に基づいてリダイレクト判定を返す
 * - 未認証で保護ルートへのアクセス → /login へリダイレクト
 * - 認証済みで公開専用ルートへのアクセス → / へリダイレクト
 */
export function getRedirectDecision(
  pathname: string,
  isAuthenticated: boolean
): RedirectDecision {
  if (isProtectedRoute(pathname) && !isAuthenticated) {
    return { redirect: true, to: "/login" };
  }
  if (isPublicOnlyRoute(pathname) && isAuthenticated) {
    return { redirect: true, to: "/" };
  }
  return { redirect: false };
}

/** Admin 専用ルート（/users, /users/[id]）かどうかを返す */
export function isAdminRoute(pathname: string): boolean {
  return pathname === "/users" || pathname.startsWith("/users/");
}

/**
 * パス名・認証状態・ロールに基づいてリダイレクト判定を返す
 * - 未認証で保護ルートへのアクセス → /login へリダイレクト
 * - 認証済みで公開専用ルートへのアクセス → / へリダイレクト
 * - Admin 以外が Admin 専用ルートへのアクセス → / へリダイレクト
 */
export function getRedirectDecisionWithRole(
  pathname: string,
  isAuthenticated: boolean,
  role: UserRole | null
): RedirectDecision {
  if (isProtectedRoute(pathname) && !isAuthenticated) {
    return { redirect: true, to: "/login" };
  }
  if (isPublicOnlyRoute(pathname) && isAuthenticated) {
    return { redirect: true, to: "/" };
  }
  if (isAdminRoute(pathname) && isAuthenticated && role !== "Admin") {
    return { redirect: true, to: "/" };
  }
  return { redirect: false };
}
