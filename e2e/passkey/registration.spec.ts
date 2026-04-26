import { test, expect } from "../fixtures/auth";
import { setupVirtualAuthenticator } from "../fixtures/webauthn";

/**
 * 登録フローと削除フローは状態を共有するため serial で実行する。
 * 各テストは使用したパスキーを必ず自分でクリーンアップする。
 */
test.describe.configure({ mode: "serial" });

test.describe("パスキー登録フロー", () => {
  const PASSKEY_NAME = `E2E-Reg-${Date.now()}`;

  test.beforeEach(async ({ adminPage: page }) => {
    await page.goto("/account/passkeys");
    await page.getByRole("heading", { name: "パスキー管理" }).waitFor();
    await setupVirtualAuthenticator(page);
  });

  test("パスキーを登録すると一覧に追加される", async ({
    adminPage: page,
  }) => {
    // Arrange
    await page.getByRole("button", { name: "パスキーを追加" }).click();
    await page.getByPlaceholder("パスキー名").fill(PASSKEY_NAME);

    // Act
    await page.getByRole("button", { name: "登録" }).click();

    // Assert
    await expect(page.getByText("パスキーを登録しました")).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText(PASSKEY_NAME)).toBeVisible();

    // Cleanup
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: `${PASSKEY_NAME}を削除` }).click();
    await expect(page.getByText("パスキーを削除しました")).toBeVisible({
      timeout: 10000,
    });
  });

  test("登録後、カウンターが増加する", async ({ adminPage: page }) => {
    // Arrange: 現在のカウントを取得
    const countText = await page.getByText(/\/\s*5/).textContent();
    const currentCount = parseInt(
      countText?.match(/(\d+)\s*\/\s*5/)?.[1] ?? "0"
    );

    // Act: 登録フォームを開いて登録
    await page.getByRole("button", { name: "パスキーを追加" }).click();
    await page
      .getByPlaceholder("パスキー名")
      .fill(`${PASSKEY_NAME}-counter`);
    await page.getByRole("button", { name: "登録" }).click();
    await expect(page.getByText("パスキーを登録しました")).toBeVisible({
      timeout: 15000,
    });

    // Assert: カウントが増えている
    await expect(page.getByText(`${currentCount + 1} / 5`)).toBeVisible();

    // Cleanup
    page.once("dialog", (dialog) => dialog.accept());
    await page
      .getByRole("button", { name: `${PASSKEY_NAME}-counterを削除` })
      .click();
    await expect(page.getByText("パスキーを削除しました")).toBeVisible({
      timeout: 10000,
    });
  });
});

test.describe("パスキー削除フロー", () => {
  const PASSKEY_NAME = `E2E-Del-${Date.now()}`;

  test.beforeEach(async ({ adminPage: page }) => {
    await page.goto("/account/passkeys");
    await page.getByRole("heading", { name: "パスキー管理" }).waitFor();
    await setupVirtualAuthenticator(page);

    // テスト用パスキーを登録する
    await page.getByRole("button", { name: "パスキーを追加" }).click();
    await page.getByPlaceholder("パスキー名").fill(PASSKEY_NAME);
    await page.getByRole("button", { name: "登録" }).click();
    await expect(page.getByText("パスキーを登録しました")).toBeVisible({
      timeout: 15000,
    });
  });

  test("削除確認ダイアログを承認するとパスキーが削除される", async ({
    adminPage: page,
  }) => {
    // Arrange
    page.once("dialog", (dialog) => dialog.accept());

    // Act
    await page.getByRole("button", { name: `${PASSKEY_NAME}を削除` }).click();

    // Assert
    await expect(page.getByText("パスキーを削除しました")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText(PASSKEY_NAME)).not.toBeVisible();
  });

  test("削除確認ダイアログをキャンセルするとパスキーは残る", async ({
    adminPage: page,
  }) => {
    // Arrange
    page.once("dialog", (dialog) => dialog.dismiss());

    // Act
    await page.getByRole("button", { name: `${PASSKEY_NAME}を削除` }).click();

    // Assert: パスキーはリストに残っている
    await expect(page.getByText(PASSKEY_NAME)).toBeVisible();

    // Cleanup
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: `${PASSKEY_NAME}を削除` }).click();
    await expect(page.getByText("パスキーを削除しました")).toBeVisible({
      timeout: 10000,
    });
  });
});
