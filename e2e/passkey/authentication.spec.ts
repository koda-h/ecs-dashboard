import { test, expect } from "../fixtures/auth";
import { setupVirtualAuthenticator } from "../fixtures/webauthn";

/**
 * 認証フローは「パスキー登録 → ログアウト → パスキーでログイン → クリーンアップ」の
 * 順序依存があるため serial で実行する。
 */
test.describe.configure({ mode: "serial" });

test.describe("パスキー認証フロー", () => {
  const PASSKEY_NAME = `E2E-Auth-${Date.now()}`;

  test("パスキーでログインできる", async ({ adminPage: page }) => {
    // ─── Arrange ────────────────────────────────────────────────────────────
    // 仮想認証器をセットアップし、パスキーを登録する
    await page.goto("/account/passkeys");
    await page.getByRole("heading", { name: "パスキー管理" }).waitFor();
    await setupVirtualAuthenticator(page);

    await page.getByRole("button", { name: "パスキーを追加" }).click();
    await page.getByPlaceholder("パスキー名").fill(PASSKEY_NAME);
    await page.getByRole("button", { name: "登録" }).click();
    await expect(page.getByText("パスキーを登録しました")).toBeVisible({
      timeout: 15000,
    });

    // ─── Act ─────────────────────────────────────────────────────────────────
    // セッション Cookie を削除してログアウト
    await page.context().clearCookies();
    await page.goto("/login");
    await page.getByRole("button", { name: "パスキーでログイン" }).click();

    // ─── Assert ──────────────────────────────────────────────────────────────
    // ダッシュボードへリダイレクトされる
    await page.waitForURL("/", { timeout: 15000 });
    await expect(
      page.getByRole("heading", { name: "ECS Dashboard" })
    ).toBeVisible();

    // ─── Cleanup ─────────────────────────────────────────────────────────────
    await page.goto("/account/passkeys");
    await page.getByRole("heading", { name: "パスキー管理" }).waitFor();
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: `${PASSKEY_NAME}を削除` }).click();
    await expect(page.getByText("パスキーを削除しました")).toBeVisible({
      timeout: 10000,
    });
  });
});

test.describe("パスキーログイン - UI", () => {
  test("ログインページに「パスキーでログイン」ボタンが表示される", async ({
    page,
  }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("button", { name: "パスキーでログイン" })
    ).toBeVisible();
  });
});
