import { describe, it, expect } from "vitest";
import { validatePasswordResetForm } from "@/lib/auth/validation";

// パスワードリセットフォームのバリデーション仕様
// メールアドレスを入力し「メール送信」ボタンを押すとリセットメールが届く

describe("パスワードリセットフォームバリデーション", () => {
  describe("メールアドレス入力欄", () => {
    it("有効なメールアドレスを入力した場合、フォームは有効であること", () => {
      const result = validatePasswordResetForm({ email: "user@example.com" });

      expect(result.success).toBe(true);
    });

    it("空文字の場合、フォームは無効であること", () => {
      const result = validatePasswordResetForm({ email: "" });

      expect(result.success).toBe(false);
    });

    it("@を含まない文字列の場合、フォームは無効であること", () => {
      const result = validatePasswordResetForm({ email: "userexample.com" });

      expect(result.success).toBe(false);
    });

    it("メールアドレス形式として不正な文字列の場合、フォームは無効であること", () => {
      const result = validatePasswordResetForm({ email: "not-an-email" });

      expect(result.success).toBe(false);
    });

    it("バリデーションエラーメッセージが日本語で返されること", () => {
      const result = validatePasswordResetForm({ email: "" });

      expect(result.success).toBe(false);
      if (!result.success) {
        const message = result.error.issues[0].message;
        expect(message).toMatch(/[\u3040-\u30FF\u4E00-\u9FFF]/);
      }
    });
  });

  describe("存在しないメールアドレスへの送信", () => {
    it.skip(
      "登録されていないメールアドレスを入力しても、セキュリティ上ユーザに存在有無を明かさないこと(同一のレスポンスが返ること)",
      () => {
        // このテストは Server Action + 実際の DB を使った統合テストが必要です。
        // パスワードリセット Server Action が実装された後、実DB を使用して検証してください。
        // 期待値: 登録済み・未登録どちらのメールに対しても { success: true } が返ること。
      }
    );
  });
});
