import { test, expect } from "@playwright/test";
import { test as authTest } from "../fixtures/auth";

test.describe("パスキー管理ページ - 未認証リダイレクト", () => {
  test("/account/passkeys にアクセスするとログインページにリダイレクトされる", async ({
    page,
  }) => {
    await page.goto("/account/passkeys");
    await expect(page).toHaveURL(/\/login/);
  });
});

authTest.describe("パスキー管理ページ - 表示", () => {
  authTest.beforeEach(async ({ adminPage: page }) => {
    await page.goto("/account/passkeys");
    await page.getByRole("heading", { name: "パスキー管理" }).waitFor();
  });

  authTest(
    "パスキー管理の見出しとカウンターが表示される",
    async ({ adminPage: page }) => {
      await expect(
        page.getByRole("heading", { name: "パスキー管理" })
      ).toBeVisible();
      await expect(page.getByText(/登録済みパスキー/)).toBeVisible();
      await expect(page.getByText(/\/\s*5/)).toBeVisible();
    }
  );

  authTest(
    "ダッシュボードへ戻るリンクが表示される",
    async ({ adminPage: page }) => {
      await expect(
        page.getByRole("link", { name: "← ダッシュボードに戻る" })
      ).toBeVisible();
    }
  );

  authTest(
    "「パスキーを追加」ボタンが表示される",
    async ({ adminPage: page }) => {
      await expect(
        page.getByRole("button", { name: "パスキーを追加" })
      ).toBeVisible();
    }
  );

  authTest(
    "「パスキーを追加」ボタンをクリックすると登録フォームが表示される",
    async ({ adminPage: page }) => {
      await page.getByRole("button", { name: "パスキーを追加" }).click();

      await expect(page.getByPlaceholder("パスキー名")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "登録" })
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "キャンセル" })
      ).toBeVisible();
    }
  );

  authTest(
    "「キャンセル」ボタンで登録フォームが非表示になる",
    async ({ adminPage: page }) => {
      await page.getByRole("button", { name: "パスキーを追加" }).click();
      await page.getByRole("button", { name: "キャンセル" }).click();

      await expect(page.getByPlaceholder("パスキー名")).not.toBeVisible();
      await expect(
        page.getByRole("button", { name: "パスキーを追加" })
      ).toBeVisible();
    }
  );

  authTest(
    "パスキー名が空の場合「登録」ボタンが無効になる",
    async ({ adminPage: page }) => {
      await page.getByRole("button", { name: "パスキーを追加" }).click();

      await expect(page.getByRole("button", { name: "登録" })).toBeDisabled();
    }
  );

  authTest(
    "パスキー名を入力すると「登録」ボタンが有効になる",
    async ({ adminPage: page }) => {
      await page.getByRole("button", { name: "パスキーを追加" }).click();
      await page.getByPlaceholder("パスキー名").fill("My Passkey");

      await expect(page.getByRole("button", { name: "登録" })).toBeEnabled();
    }
  );
});

authTest.describe("UserMenu - パスキー管理リンク", () => {
  authTest(
    "ダッシュボードの UserMenu に「パスキー管理」リンクが表示される",
    async ({ adminPage: page }) => {
      await page.goto("/");
      await page.getByRole("button", { name: "メニュー" }).click();
      await expect(
        page.getByRole("link", { name: "パスキー管理" })
      ).toBeVisible();
    }
  );

  authTest(
    "「パスキー管理」リンクをクリックするとパスキー管理ページへ遷移する",
    async ({ adminPage: page }) => {
      await page.goto("/");
      await page.getByRole("button", { name: "メニュー" }).click();
      await page.getByRole("link", { name: "パスキー管理" }).click();
      await expect(page).toHaveURL(/\/account\/passkeys/);
      await expect(
        page.getByRole("heading", { name: "パスキー管理" })
      ).toBeVisible();
    }
  );
});
