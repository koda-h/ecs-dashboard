import { test, expect } from "@playwright/test";

test.describe("ログインページ", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("ログインフォームが表示される", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "ログイン" })).toBeVisible();
    await expect(page.getByLabel("ユーザID / メールアドレス")).toBeVisible();
    await expect(page.getByLabel("パスワード")).toBeVisible();
    await expect(page.getByRole("button", { name: "ログイン", exact: true })).toBeVisible();
  });

  test("空のフォームを送信するとバリデーションエラーが表示される", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "ログイン", exact: true }).click();
    // フィールドエラーまたはサーバーエラーが表示されることを確認
    await expect(
      page.locator("[id$='-error'], .text-red-600").first()
    ).toBeVisible();
  });

  test("誤った認証情報でエラーが表示される", async ({ page }) => {
    await page.getByLabel("ユーザID / メールアドレス").fill("invalid-user");
    await page.getByLabel("パスワード").fill("wrongpassword");
    await page.getByRole("button", { name: "ログイン", exact: true }).click();

    await expect(
      page.getByText("IDまたはパスワードが正しくありません")
    ).toBeVisible();
  });

  test("パスワードリセットリンクが表示される", async ({ page }) => {
    await expect(
      page.getByRole("link", { name: "パスワードをお忘れの方はこちら" })
    ).toBeVisible();
  });

  test("新規登録リンクが表示される", async ({ page }) => {
    await expect(page.getByRole("link", { name: "新規登録" })).toBeVisible();
  });
});
