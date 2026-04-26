import { test, expect } from "../fixtures/auth";

test.describe("ダッシュボード - Admin", () => {
  test("ECS Dashboard の見出しが表示される", async ({ adminPage: page }) => {
    await expect(
      page.getByRole("heading", { name: "ECS Dashboard" })
    ).toBeVisible();
  });

  test("UserMenu が表示される", async ({ adminPage: page }) => {
    // ログインユーザのIDがメニューに表示される
    const adminId = process.env.E2E_ADMIN_ID ?? "e2e-admin";
    await expect(page.getByText(adminId)).toBeVisible();
  });

  test("ユーザ管理ページへ遷移できる", async ({ adminPage: page }) => {
    await page.goto("/users");
    await expect(
      page.getByRole("heading", { name: "ユーザ一覧" })
    ).toBeVisible();
  });
});

test.describe("ダッシュボード - Editor", () => {
  test("ECS Dashboard の見出しが表示される", async ({ editorPage: page }) => {
    await expect(
      page.getByRole("heading", { name: "ECS Dashboard" })
    ).toBeVisible();
  });
});

test.describe("ダッシュボード - Viewer", () => {
  test("ECS Dashboard の見出しが表示される", async ({ viewerPage: page }) => {
    await expect(
      page.getByRole("heading", { name: "ECS Dashboard" })
    ).toBeVisible();
  });
});
