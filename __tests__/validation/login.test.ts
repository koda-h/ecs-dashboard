import { describe, it, expect } from "vitest";
import { validateLoginId, validateLoginForm } from "@/lib/auth/validation";

// ログインフォームの入力バリデーション仕様
// ログインIDにはユーザIDとメールアドレスの両方を受け付ける

describe("ログインIDバリデーション", () => {
  describe("ユーザIDとして有効な入力", () => {
    it("有効なユーザID形式の文字列はログインIDとして有効であること", () => {
      const result = validateLoginId("valid123");

      expect(result.success).toBe(true);
    });

    it("英数字とハイフン・アンダーバーを含む文字列はログインIDとして有効であること", () => {
      const result = validateLoginId("user-name_01");

      expect(result.success).toBe(true);
    });
  });

  describe("メールアドレスとして有効な入力", () => {
    it("有効なメールアドレス形式の文字列はログインIDとして有効であること", () => {
      const result = validateLoginId("user@example.com");

      expect(result.success).toBe(true);
    });

    it("サブドメインを含むメールアドレスはログインIDとして有効であること", () => {
      const result = validateLoginId("user@mail.example.com");

      expect(result.success).toBe(true);
    });
  });

  describe("無効な入力", () => {
    it("空文字のログインIDは無効であること", () => {
      const result = validateLoginId("");

      expect(result.success).toBe(false);
    });

    it("ユーザID形式にもメールアドレス形式にも該当しない文字列は無効であること", () => {
      // 短すぎてユーザIDでも、@がないのでメールでもない
      const result = validateLoginId("x");

      expect(result.success).toBe(false);
    });

    it("スペースのみのログインIDは無効であること", () => {
      const result = validateLoginId("   ");

      expect(result.success).toBe(false);
    });
  });
});

describe("ログインフォームパスワードバリデーション", () => {
  it("空文字のパスワードは無効であること", () => {
    const result = validateLoginForm({ loginId: "user123", password: "" });

    expect(result.success).toBe(false);
  });

  it("1文字以上のパスワードは入力値として受け付けられること(存在確認のみ・認証は別途行う)", () => {
    // ログインフォームのパスワードは「空でないこと」のみ検証する
    // 文字数や文字種の制約はログイン時には適用しない（パスワード変更ユーザへの配慮）
    const result = validateLoginForm({ loginId: "user123", password: "a" });

    expect(result.success).toBe(true);
  });
});

describe("ログインフォーム全体バリデーション", () => {
  it("ログインIDとパスワードの両方が入力されている場合、フォームは有効であること", () => {
    const result = validateLoginForm({
      loginId: "user123",
      password: "somepassword",
    });

    expect(result.success).toBe(true);
  });

  it("ログインIDが空の場合、フォームは無効であること", () => {
    const result = validateLoginForm({ loginId: "", password: "somepassword" });

    expect(result.success).toBe(false);
  });

  it("パスワードが空の場合、フォームは無効であること", () => {
    const result = validateLoginForm({ loginId: "user123", password: "" });

    expect(result.success).toBe(false);
  });

  it("両方が空の場合、フォームは無効であること", () => {
    const result = validateLoginForm({ loginId: "", password: "" });

    expect(result.success).toBe(false);
  });
});
