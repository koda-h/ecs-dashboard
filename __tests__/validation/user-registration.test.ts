import { describe, it, expect, beforeEach } from "vitest";
import {
  validateUserId,
  validateEmail,
  validatePassword,
  validatePasswordConfirm,
  validateRegisterForm,
} from "@/lib/auth/validation";

// ユーザ登録フォームの各フィールドに対するバリデーション仕様

describe("ユーザIDバリデーション", () => {
  describe("許可文字種", () => {
    it("半角英小文字のみで構成されたユーザIDは有効であること", () => {
      const result = validateUserId("abcde");

      expect(result.success).toBe(true);
    });

    it("半角英大文字のみで構成されたユーザIDは有効であること", () => {
      const result = validateUserId("ABCDE");

      expect(result.success).toBe(true);
    });

    it("半角数字のみで構成されたユーザIDは有効であること", () => {
      const result = validateUserId("12345");

      expect(result.success).toBe(true);
    });

    it("半角英字と数字を混在させたユーザIDは有効であること", () => {
      const result = validateUserId("abc123");

      expect(result.success).toBe(true);
    });

    it("英数字の間にハイフンを含むユーザIDは有効であること", () => {
      const result = validateUserId("user-name");

      expect(result.success).toBe(true);
    });

    it("英数字の間にアンダーバーを含むユーザIDは有効であること", () => {
      const result = validateUserId("user_name");

      expect(result.success).toBe(true);
    });

    it("ハイフンとアンダーバーの両方を含むユーザIDは有効であること", () => {
      const result = validateUserId("user-name_123");

      expect(result.success).toBe(true);
    });

    it("全角文字を含むユーザIDは無効であること", () => {
      const result = validateUserId("ａｂｃ");

      expect(result.success).toBe(false);
    });

    it("スペースを含むユーザIDは無効であること", () => {
      const result = validateUserId("user name");

      expect(result.success).toBe(false);
    });

    it("@を含むユーザIDは無効であること", () => {
      const result = validateUserId("user@name");

      expect(result.success).toBe(false);
    });

    it("ドット(.)を含むユーザIDは無効であること", () => {
      const result = validateUserId("user.name");

      expect(result.success).toBe(false);
    });

    it("感嘆符(!)などのハイフン・アンダーバー以外の記号を含むユーザIDは無効であること", () => {
      const result = validateUserId("user!name");

      expect(result.success).toBe(false);
    });

    it("日本語(ひらがな・カタカナ・漢字)を含むユーザIDは無効であること", () => {
      const result = validateUserId("ユーザー123");

      expect(result.success).toBe(false);
    });
  });

  describe("文字数制約", () => {
    it("3文字(最小文字数)のユーザIDは有効であること", () => {
      const result = validateUserId("abc");

      expect(result.success).toBe(true);
    });

    it("50文字(最大文字数)のユーザIDは有効であること", () => {
      // 50文字 = 英字48文字 + 両端の英字
      const result = validateUserId("a" + "b".repeat(48) + "c");

      expect(result.success).toBe(true);
    });

    it("3〜50文字の間のユーザIDは有効であること", () => {
      const result = validateUserId("user123");

      expect(result.success).toBe(true);
    });

    it("2文字(最小文字数未満)のユーザIDは無効であること", () => {
      const result = validateUserId("ab");

      expect(result.success).toBe(false);
    });

    it("51文字(最大文字数超過)のユーザIDは無効であること", () => {
      const result = validateUserId("a" + "b".repeat(49) + "c");

      expect(result.success).toBe(false);
    });

    it("空文字のユーザIDは無効であること", () => {
      const result = validateUserId("");

      expect(result.success).toBe(false);
    });
  });

  describe("先頭・末尾の制約", () => {
    it("先頭がハイフンのユーザIDは無効であること", () => {
      const result = validateUserId("-username");

      expect(result.success).toBe(false);
    });

    it("先頭がアンダーバーのユーザIDは無効であること", () => {
      const result = validateUserId("_username");

      expect(result.success).toBe(false);
    });

    it("末尾がハイフンのユーザIDは無効であること", () => {
      const result = validateUserId("username-");

      expect(result.success).toBe(false);
    });

    it("末尾がアンダーバーのユーザIDは無効であること", () => {
      const result = validateUserId("username_");

      expect(result.success).toBe(false);
    });

    it("先頭が半角英字で末尾も半角英字のユーザIDは有効であること", () => {
      const result = validateUserId("abc");

      expect(result.success).toBe(true);
    });

    it("先頭が半角数字で末尾も半角数字のユーザIDは有効であること", () => {
      const result = validateUserId("123");

      expect(result.success).toBe(true);
    });
  });
});

describe("メールアドレスバリデーション", () => {
  describe("有効なフォーマット", () => {
    it("標準的な形式(user@example.com)のメールアドレスは有効であること", () => {
      const result = validateEmail("user@example.com");

      expect(result.success).toBe(true);
    });

    it("サブドメインを含むメールアドレスは有効であること", () => {
      const result = validateEmail("user@mail.example.com");

      expect(result.success).toBe(true);
    });

    it("プラス記号を含むローカル部(user+tag@example.com)は有効であること", () => {
      const result = validateEmail("user+tag@example.com");

      expect(result.success).toBe(true);
    });

    it("ドットを含むローカル部(first.last@example.com)は有効であること", () => {
      const result = validateEmail("first.last@example.com");

      expect(result.success).toBe(true);
    });

    it("数字を含むドメイン(user@example123.com)は有効であること", () => {
      const result = validateEmail("user@example123.com");

      expect(result.success).toBe(true);
    });
  });

  describe("無効なフォーマット", () => {
    it("空文字のメールアドレスは無効であること", () => {
      const result = validateEmail("");

      expect(result.success).toBe(false);
    });

    it("@が含まれないメールアドレスは無効であること", () => {
      const result = validateEmail("userexample.com");

      expect(result.success).toBe(false);
    });

    it("@の後にドメインがないメールアドレスは無効であること", () => {
      const result = validateEmail("user@");

      expect(result.success).toBe(false);
    });

    it("@の前にローカル部がないメールアドレスは無効であること", () => {
      const result = validateEmail("@example.com");

      expect(result.success).toBe(false);
    });

    it("@が2つ以上あるメールアドレスは無効であること", () => {
      const result = validateEmail("user@@example.com");

      expect(result.success).toBe(false);
    });

    it("スペースを含むメールアドレスは無効であること", () => {
      const result = validateEmail("user @example.com");

      expect(result.success).toBe(false);
    });

    it("TLD(トップレベルドメイン)がないメールアドレスは無効であること", () => {
      const result = validateEmail("user@example");

      expect(result.success).toBe(false);
    });
  });
});

describe("パスワードバリデーション", () => {
  describe("文字数制約", () => {
    it("12文字(最小文字数)のパスワードは有効であること", () => {
      // 英字と数字を含む12文字
      const result = validatePassword("Password123456");

      expect(result.success).toBe(true);
    });

    it("80文字(最大文字数)のパスワードは有効であること", () => {
      // 先頭に英字・数字を含む80文字
      const result = validatePassword("Pass1" + "a".repeat(75));

      expect(result.success).toBe(true);
    });

    it("12〜80文字の間のパスワードは有効であること", () => {
      const result = validatePassword("MyPass123!@#");

      expect(result.success).toBe(true);
    });

    it("11文字(最小文字数未満)のパスワードは無効であること", () => {
      const result = validatePassword("Password12");

      expect(result.success).toBe(false);
    });

    it("81文字(最大文字数超過)のパスワードは無効であること", () => {
      const result = validatePassword("Pass1" + "a".repeat(76));

      expect(result.success).toBe(false);
    });

    it("空文字のパスワードは無効であること", () => {
      const result = validatePassword("");

      expect(result.success).toBe(false);
    });
  });

  describe("文字種制約", () => {
    it("英字と数字をそれぞれ1文字以上含む12文字以上のパスワードは有効であること", () => {
      const result = validatePassword("abcdefghij12");

      expect(result.success).toBe(true);
    });

    it("英字・数字に加えて記号を含むパスワードは有効であること", () => {
      const result = validatePassword("Password123!");

      expect(result.success).toBe(true);
    });

    it("大文字・小文字・数字を含むパスワードは有効であること", () => {
      const result = validatePassword("MyPassword123");

      expect(result.success).toBe(true);
    });

    it("英字のみで構成されたパスワードは無効であること(数字が含まれない)", () => {
      const result = validatePassword("PasswordOnly!");

      expect(result.success).toBe(false);
    });

    it("数字のみで構成されたパスワードは無効であること(英字が含まれない)", () => {
      const result = validatePassword("123456789012");

      expect(result.success).toBe(false);
    });

    it("記号のみで構成されたパスワードは無効であること(英数字が含まれない)", () => {
      const result = validatePassword("!@#$%^&*()!@");

      expect(result.success).toBe(false);
    });
  });
});

describe("パスワード確認バリデーション", () => {
  let validPassword: string;

  beforeEach(() => {
    validPassword = "Password123!";
  });

  it("パスワードと確認用パスワードが一致する場合は有効であること", () => {
    const result = validatePasswordConfirm(validPassword, validPassword);

    expect(result.success).toBe(true);
  });

  it("パスワードと確認用パスワードが一致しない場合は無効であること", () => {
    const result = validatePasswordConfirm(validPassword, "DifferentPass1");

    expect(result.success).toBe(false);
  });

  it("確認用パスワードが空の場合は無効であること", () => {
    const result = validatePasswordConfirm(validPassword, "");

    expect(result.success).toBe(false);
  });

  it("パスワードと確認用パスワードが大文字・小文字のみ異なる場合は無効であること(大文字小文字を区別すること)", () => {
    const result = validatePasswordConfirm("password123abc", "PASSWORD123ABC");

    expect(result.success).toBe(false);
  });

  it("パスワードと確認用パスワードが末尾の空白のみ異なる場合は無効であること", () => {
    const result = validatePasswordConfirm(validPassword, validPassword + " ");

    expect(result.success).toBe(false);
  });
});

describe("ユーザ登録フォーム全体バリデーション", () => {
  let validForm: {
    userId: string;
    email: string;
    password: string;
    passwordConfirm: string;
  };

  beforeEach(() => {
    validForm = {
      userId: "valid-user",
      email: "user@example.com",
      password: "Password123!",
      passwordConfirm: "Password123!",
    };
  });

  it("全フィールドが有効な値の場合、フォームは有効であること", () => {
    const result = validateRegisterForm(validForm);

    expect(result.success).toBe(true);
  });

  it("ユーザIDが無効な場合、フォームは無効であること", () => {
    const result = validateRegisterForm({ ...validForm, userId: "-invalid" });

    expect(result.success).toBe(false);
  });

  it("メールアドレスが無効な場合、フォームは無効であること", () => {
    const result = validateRegisterForm({
      ...validForm,
      email: "not-an-email",
    });

    expect(result.success).toBe(false);
  });

  it("パスワードが無効な場合、フォームは無効であること", () => {
    const result = validateRegisterForm({
      ...validForm,
      password: "short",
      passwordConfirm: "short",
    });

    expect(result.success).toBe(false);
  });

  it("パスワード確認が一致しない場合、フォームは無効であること", () => {
    const result = validateRegisterForm({
      ...validForm,
      passwordConfirm: "DifferentPass1",
    });

    expect(result.success).toBe(false);
  });

  it("複数フィールドが同時に無効な場合、すべてのエラーが返されること", () => {
    const result = validateRegisterForm({
      userId: "x", // 短すぎる
      email: "not-email",
      password: "short",
      passwordConfirm: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(1);
    }
  });

  it("各フィールドのバリデーションエラーメッセージが日本語で返されること", () => {
    const result = validateRegisterForm({
      userId: "x",
      email: "bad",
      password: "short",
      passwordConfirm: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      // 日本語文字（ひらがな・カタカナ・漢字）が含まれることを確認
      const messages = result.error.issues.map((i) => i.message);
      messages.forEach((message) => {
        expect(message).toMatch(/[\u3040-\u30FF\u4E00-\u9FFF]/);
      });
    }
  });
});
