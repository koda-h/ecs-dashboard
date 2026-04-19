import { test, expect } from "@playwright/test";

test.describe("未認証時のリダイレクト", () => {
  test("トップページにアクセスするとログインページにリダイレクトされる", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });

  test("ユーザ管理ページにアクセスするとログインページにリダイレクトされる", async ({
    page,
  }) => {
    await page.goto("/users");
    await expect(page).toHaveURL(/\/login/);
  });
});
