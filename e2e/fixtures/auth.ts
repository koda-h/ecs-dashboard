import { test as base, type Page } from "@playwright/test";

/**
 * ログイン操作を実行するヘルパー関数
 */
async function login(page: Page, loginId: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("ユーザID / メールアドレス").fill(loginId);
  await page.getByLabel("パスワード").fill(password);
  await page.getByRole("button", { name: "ログイン", exact: true }).click();

  // ログイン成功でダッシュボードへリダイレクトされるのを待つ
  await page.waitForURL("/", { timeout: 15000 });

  // ダッシュボードの見出しが表示されるまで待機（SSR 完了を保証）
  await page.getByRole("heading", { name: "ECS Dashboard" }).waitFor();
}

type AuthFixtures = {
  adminPage: Page;
  editorPage: Page;
  viewerPage: Page;
};

/**
 * 各ロールでログイン済みの Page を提供する fixture
 *
 * 使用するには環境変数を設定してください:
 *   E2E_ADMIN_ID, E2E_ADMIN_PASSWORD
 *   E2E_EDITOR_ID, E2E_EDITOR_PASSWORD
 *   E2E_VIEWER_ID, E2E_VIEWER_PASSWORD
 */
export const test = base.extend<AuthFixtures>({
  adminPage: async ({ page }, use) => {
    const id = process.env.E2E_ADMIN_ID ?? "";
    const pass = process.env.E2E_ADMIN_PASSWORD ?? "";
    await login(page, id, pass);
    await use(page);
  },

  editorPage: async ({ page }, use) => {
    const id = process.env.E2E_EDITOR_ID ?? "";
    const pass = process.env.E2E_EDITOR_PASSWORD ?? "";
    await login(page, id, pass);
    await use(page);
  },

  viewerPage: async ({ page }, use) => {
    const id = process.env.E2E_VIEWER_ID ?? "";
    const pass = process.env.E2E_VIEWER_PASSWORD ?? "";
    await login(page, id, pass);
    await use(page);
  },
});

export { expect } from "@playwright/test";
