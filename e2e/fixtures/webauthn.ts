import type { Page } from "@playwright/test";

/**
 * Chrome DevTools Protocol の WebAuthn 仮想認証機能を有効化する。
 * automaticPresenceSimulation: true により、テスト中の WebAuthn 操作（登録・認証）が
 * ユーザ操作なしで自動的に成功する。
 * 仮想認証器はブラウザコンテキスト単位で有効になり、ページをまたいで持続する。
 */
export async function setupVirtualAuthenticator(page: Page): Promise<void> {
  const client = await page.context().newCDPSession(page);
  await client.send("WebAuthn.enable", { enableUI: false });
  await client.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
}
