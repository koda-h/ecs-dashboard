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
