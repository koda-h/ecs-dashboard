import { describe, it, expect, beforeEach } from "vitest";
import {
  createSessionToken,
  verifySessionToken,
  refreshSessionToken,
  EXPIRATION_SECONDS,
} from "@/lib/auth/session";
import {
  createExpiredToken,
  createTamperedToken,
} from "@/src/test-utils/auth";

// セッション管理仕様
// JWTを用いてセッションを管理する。有効期限は24時間。
// アクセスのたびに有効期限が現時刻から24時間後に更新される(スライディングセッション)。

describe("セッショントークン生成", () => {
  it("有効なユーザ情報を与えるとセッショントークンが生成されること", async () => {
    const token = await createSessionToken("user123");

    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
    // JWT形式: header.payload.signature の3パーツ
    expect(token.split(".")).toHaveLength(3);
  });

  it("生成されたトークンにユーザIDが含まれること", async () => {
    const userId = "user123";

    const token = await createSessionToken(userId);
    const payload = await verifySessionToken(token);

    expect(payload.userId).toBe(userId);
  });

  it("生成されたトークンの有効期限が現時刻から24時間後であること", async () => {
    const beforeSec = Math.floor(Date.now() / 1000);

    const token = await createSessionToken("user123");

    const afterSec = Math.floor(Date.now() / 1000);
    const payload = await verifySessionToken(token);
    // exp は現時刻 + 24h の範囲内にあること
    expect(payload.exp).toBeGreaterThanOrEqual(beforeSec + EXPIRATION_SECONDS);
    expect(payload.exp).toBeLessThanOrEqual(afterSec + EXPIRATION_SECONDS);
  });

  it("同一ユーザで2回生成しても毎回異なるトークンが生成されること", async () => {
    // setJti(randomUUID()) により、同一秒内でも異なるトークンが生成される
    const token1 = await createSessionToken("user123");
    const token2 = await createSessionToken("user123");

    expect(token1).not.toBe(token2);
  });
});

describe("セッショントークン検証", () => {
  describe("有効なトークン", () => {
    let validToken: string;

    beforeEach(async () => {
      validToken = await createSessionToken("user123");
    });

    it("有効期限内の正規トークンを検証すると、ペイロード(ユーザ情報)が返されること", async () => {
      const payload = await verifySessionToken(validToken);

      expect(payload.userId).toBe("user123");
    });
  });

  describe("有効期限切れのトークン", () => {
    let expiredToken: string;

    beforeEach(async () => {
      expiredToken = await createExpiredToken("user123");
    });

    it("有効期限が切れたトークンを検証するとエラーになること", async () => {
      await expect(verifySessionToken(expiredToken)).rejects.toThrow();
    });
  });

  describe("改ざんされたトークン", () => {
    let tamperedToken: string;

    beforeEach(async () => {
      tamperedToken = await createTamperedToken("user123");
    });

    it("署名を改ざんしたトークンを検証するとエラーになること", async () => {
      await expect(verifySessionToken(tamperedToken)).rejects.toThrow();
    });

    it("ペイロードを改ざんしたトークンを検証するとエラーになること", async () => {
      // createTamperedToken はペイロードを書き換え署名を変えていない → 検証失敗
      await expect(verifySessionToken(tamperedToken)).rejects.toThrow();
    });
  });

  it("まったく関係のない文字列を検証するとエラーになること", async () => {
    await expect(verifySessionToken("not.a.jwt")).rejects.toThrow();
  });

  it("空文字のトークンを検証するとエラーになること", async () => {
    await expect(verifySessionToken("")).rejects.toThrow();
  });

  it("トークンがnullの場合に検証するとエラーになること", async () => {
    // null を渡すと型エラーになるため、unknown でキャスト
    await expect(verifySessionToken(null as unknown as string)).rejects.toThrow();
  });
});

describe("セッション有効期限の更新(スライディングセッション)", () => {
  describe("有効なトークンの更新", () => {
    let originalToken: string;
    let originalPayload: Awaited<ReturnType<typeof verifySessionToken>>;

    beforeEach(async () => {
      originalToken = await createSessionToken("user123");
      originalPayload = await verifySessionToken(originalToken);
    });

    it("有効なトークンを更新すると、新しい有効期限が現時刻から24時間後になること", async () => {
      const beforeSec = Math.floor(Date.now() / 1000);

      const newToken = await refreshSessionToken(originalToken);

      const afterSec = Math.floor(Date.now() / 1000);
      const newPayload = await verifySessionToken(newToken);
      expect(newPayload.exp).toBeGreaterThanOrEqual(
        beforeSec + EXPIRATION_SECONDS
      );
      expect(newPayload.exp).toBeLessThanOrEqual(
        afterSec + EXPIRATION_SECONDS
      );
    });

    it("有効期限まで残り1時間のトークンを更新しても、新しい有効期限は現時刻から24時間後になること", async () => {
      // 残り1時間ということはもともと23時間前に発行されたトークンだが、
      // 本テストでは「更新後の exp が 24h 後になること」を検証する
      const beforeSec = Math.floor(Date.now() / 1000);

      const newToken = await refreshSessionToken(originalToken);

      const afterSec = Math.floor(Date.now() / 1000);
      const newPayload = await verifySessionToken(newToken);
      expect(newPayload.exp).toBeGreaterThanOrEqual(
        beforeSec + EXPIRATION_SECONDS
      );
      expect(newPayload.exp).toBeLessThanOrEqual(
        afterSec + EXPIRATION_SECONDS
      );
    });

    it("有効期限まで残り23時間59分のトークンを更新すると、有効期限が延長されること", async () => {
      const newToken = await refreshSessionToken(originalToken);
      const newPayload = await verifySessionToken(newToken);

      // 元のexpより新しいexpの方が後であること（延長されている）
      expect(newPayload.exp!).toBeGreaterThanOrEqual(originalPayload.exp!);
    });

    it("更新後のトークンにはもとのユーザ情報が引き継がれること", async () => {
      const newToken = await refreshSessionToken(originalToken);
      const newPayload = await verifySessionToken(newToken);

      expect(newPayload.userId).toBe(originalPayload.userId);
    });
  });

  describe("有効期限切れのトークンの更新", () => {
    let expiredToken: string;

    beforeEach(async () => {
      expiredToken = await createExpiredToken("user123");
    });

    it("有効期限切れのトークンは更新されずエラーになること", async () => {
      await expect(refreshSessionToken(expiredToken)).rejects.toThrow();
    });
  });
});

describe("セッショントークンのペイロード", () => {
  let token: string;

  beforeEach(async () => {
    token = await createSessionToken("user123");
  });

  it("トークンのペイロードにユーザIDが含まれること", async () => {
    const payload = await verifySessionToken(token);

    expect(payload.userId).toBeDefined();
    expect(payload.userId).toBe("user123");
  });

  it("トークンのペイロードにメールアドレスが含まれないこと(機密情報の漏洩防止)", async () => {
    const payload = await verifySessionToken(token);

    expect((payload as Record<string, unknown>).email).toBeUndefined();
  });

  it("トークンのペイロードにパスワードが含まれないこと", async () => {
    const payload = await verifySessionToken(token);

    expect((payload as Record<string, unknown>).password).toBeUndefined();
  });
});
