import { describe, it, expect, beforeEach } from "vitest";
import { isProtectedRoute, isPublicOnlyRoute, getRedirectDecision } from "@/lib/auth/guard";
import { checkAuthentication } from "@/lib/auth/session";
import { createSessionToken } from "@/lib/auth/session";
import { createExpiredToken, createTamperedToken } from "@/src/test-utils/auth";

// 認証ガード仕様
// ログインしていないユーザはサービス一覧画面(/)に遷移できない。
// セッション検証ロジックの純粋関数部分をテストする。

describe("セッション有効性チェック", () => {
  describe("有効なトークン", () => {
    let validToken: string;

    beforeEach(async () => {
      validToken = await createSessionToken("user123");
    });

    it("有効なセッショントークンを渡した場合、認証済みと判定されること", async () => {
      const result = await checkAuthentication(validToken);

      expect(result).toBe(true);
    });
  });

  describe("有効期限切れのトークン", () => {
    let expiredToken: string;

    beforeEach(async () => {
      expiredToken = await createExpiredToken("user123");
    });

    it("有効期限切れのセッショントークンを渡した場合、未認証と判定されること", async () => {
      const result = await checkAuthentication(expiredToken);

      expect(result).toBe(false);
    });
  });

  describe("改ざんされたトークン", () => {
    let tamperedToken: string;

    beforeEach(async () => {
      tamperedToken = await createTamperedToken("user123");
    });

    it("改ざんされたセッショントークンを渡した場合、未認証と判定されること", async () => {
      const result = await checkAuthentication(tamperedToken);

      expect(result).toBe(false);
    });
  });

  it("空文字のセッショントークンを渡した場合、未認証と判定されること", async () => {
    const result = await checkAuthentication("");

    expect(result).toBe(false);
  });

  it("セッショントークンが存在しない(undefined/null)場合、未認証と判定されること", async () => {
    const resultNull = await checkAuthentication(null);
    const resultUndefined = await checkAuthentication(undefined);

    expect(resultNull).toBe(false);
    expect(resultUndefined).toBe(false);
  });

  it("まったく関係のない文字列をセッショントークンとして渡した場合、未認証と判定されること", async () => {
    const result = await checkAuthentication("not-a-token-at-all");

    expect(result).toBe(false);
  });
});

describe("保護対象ルートへのアクセス判定", () => {
  it("未認証状態でサービス一覧ページ(/)へのアクセスはログインページへのリダイレクトが必要と判定されること", () => {
    const decision = getRedirectDecision("/", false);

    expect(decision.redirect).toBe(true);
    if (decision.redirect) {
      expect(decision.to).toBe("/login");
    }
  });

  it("認証済み状態でサービス一覧ページ(/)へのアクセスは許可と判定されること", () => {
    const decision = getRedirectDecision("/", true);

    expect(decision.redirect).toBe(false);
  });

  it("未認証状態でログインページ(/login)へのアクセスはリダイレクト不要と判定されること", () => {
    const decision = getRedirectDecision("/login", false);

    expect(decision.redirect).toBe(false);
  });

  it("未認証状態でユーザ登録ページ(/register)へのアクセスはリダイレクト不要と判定されること", () => {
    const decision = getRedirectDecision("/register", false);

    expect(decision.redirect).toBe(false);
  });

  it("未認証状態でパスワードリセットページ(/password-reset)へのアクセスはリダイレクト不要と判定されること", () => {
    const decision = getRedirectDecision("/password-reset", false);

    expect(decision.redirect).toBe(false);
  });
});

describe("認証済みユーザの認証ページアクセス", () => {
  it("認証済み状態でログインページ(/login)にアクセスした場合、サービス一覧ページへのリダイレクトが必要と判定されること", () => {
    const decision = getRedirectDecision("/login", true);

    expect(decision.redirect).toBe(true);
    if (decision.redirect) {
      expect(decision.to).toBe("/");
    }
  });

  it("認証済み状態でユーザ登録ページ(/register)にアクセスした場合、サービス一覧ページへのリダイレクトが必要と判定されること", () => {
    const decision = getRedirectDecision("/register", true);

    expect(decision.redirect).toBe(true);
    if (decision.redirect) {
      expect(decision.to).toBe("/");
    }
  });
});

describe("ルートの分類", () => {
  it("サービス一覧ページは認証必須ルートとして分類されること", () => {
    expect(isProtectedRoute("/")).toBe(true);
  });

  it("ログインページは公開ルートとして分類されること", () => {
    expect(isProtectedRoute("/login")).toBe(false);
  });

  it("ユーザ登録ページは公開ルートとして分類されること", () => {
    expect(isProtectedRoute("/register")).toBe(false);
  });

  it("パスワードリセットページは公開ルートとして分類されること", () => {
    expect(isProtectedRoute("/password-reset")).toBe(false);
  });
});
