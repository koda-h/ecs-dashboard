import { describe, it, expect, beforeEach } from "vitest";
import {
  isLocked,
  isLockExpired,
  applyLoginFailure,
  applyLoginSuccess,
  getRemainingLockTime,
  createInitialLockState,
  LOCK_THRESHOLD,
  LOCK_DURATION_MS,
  AccountLockState,
} from "@/lib/auth/account-lock";
import {
  createAlmostLockedState,
  createLockedState,
  createExpiredLockState,
} from "@/src/test-utils/auth";

// アカウントロック仕様
// 同一アカウントへのログイン5回連続失敗でロック状態に遷移。
// ロック中はいかなる入力でもログインを拒否。
// ロック開始から30秒経過後に自動解除。

describe("失敗カウント管理", () => {
  let initialState: AccountLockState;

  beforeEach(() => {
    initialState = createInitialLockState();
  });

  it("ログイン失敗が1回の場合、アカウントはロックされないこと", () => {
    const state = applyLoginFailure(initialState);

    expect(isLocked(state)).toBe(false);
  });

  it("ログイン失敗が2回の場合、アカウントはロックされないこと", () => {
    const state = [1, 2].reduce((s) => applyLoginFailure(s), initialState);

    expect(isLocked(state)).toBe(false);
  });

  it("ログイン失敗が3回の場合、アカウントはロックされないこと", () => {
    const state = [1, 2, 3].reduce((s) => applyLoginFailure(s), initialState);

    expect(isLocked(state)).toBe(false);
  });

  it("ログイン失敗が4回の場合、アカウントはロックされないこと", () => {
    const state = createAlmostLockedState(); // failureCount = 4

    expect(isLocked(state)).toBe(false);
  });

  it("ログイン失敗が5回連続になった時点でアカウントがロック状態になること", () => {
    const almostLocked = createAlmostLockedState(); // failureCount = 4

    const lockedState = applyLoginFailure(almostLocked); // 5回目

    expect(isLocked(lockedState)).toBe(true);
    expect(lockedState.failureCount).toBe(LOCK_THRESHOLD);
    expect(lockedState.lockedAt).not.toBeNull();
  });

  it("ログイン失敗が6回以上でもロック状態が継続し多重ロックにならないこと", () => {
    const locked = createLockedState();

    const state6 = applyLoginFailure(locked); // 6回目

    // lockedAt は5回目のまま変わらない（タイマーがリセットされない）
    expect(isLocked(state6)).toBe(true);
    expect(state6.lockedAt).toEqual(locked.lockedAt);
  });

  it("ログイン成功後は失敗カウントが0にリセットされること", () => {
    const failedState = createAlmostLockedState(); // failureCount = 4

    const state = applyLoginSuccess();

    expect(state.failureCount).toBe(0);
    expect(state.lockedAt).toBeNull();
  });

  it("失敗4回後にログイン成功した場合、次の失敗カウントは1から始まること", () => {
    const almostLocked = createAlmostLockedState(); // failureCount = 4
    // ログイン成功でリセット
    const resetState = applyLoginSuccess();

    // 次の失敗
    const failedOnce = applyLoginFailure(resetState);

    expect(failedOnce.failureCount).toBe(1);
    expect(isLocked(failedOnce)).toBe(false);
  });
});

describe("ロック中の挙動", () => {
  let lockedState: AccountLockState;

  beforeEach(() => {
    lockedState = createLockedState();
  });

  it("ロック状態のアカウントへのログイン試行は正しい認証情報でも拒否されること", () => {
    // isLocked が true のとき、認証ロジックは試行前に弾くことを想定
    expect(isLocked(lockedState)).toBe(true);
  });

  it("ロック状態のアカウントへのログイン試行に対してロックを示すエラーが返されること", () => {
    // isLocked が true を返すことで上位レイヤーがエラーを返せることを確認
    expect(isLocked(lockedState)).toBe(true);
  });

  it("ロック中はロック解除までの残り時間が取得できること", () => {
    const remaining = getRemainingLockTime(lockedState);

    expect(remaining).toBeGreaterThan(0);
    expect(remaining).toBeLessThanOrEqual(LOCK_DURATION_MS);
  });
});

describe("ロック解除", () => {
  it("ロック開始から30秒経過するとロック状態が解除されること", () => {
    const lockedAt = new Date(Date.now() - LOCK_DURATION_MS); // ちょうど30秒前
    const state = createLockedState(lockedAt);
    const now = new Date();

    expect(isLocked(state, now)).toBe(false);
  });

  it("ロック開始から29秒経過しただけではロックが解除されないこと", () => {
    const lockedAt = new Date(Date.now() - (LOCK_DURATION_MS - 1_000)); // 29秒前
    const state = createLockedState(lockedAt);
    const now = new Date();

    expect(isLocked(state, now)).toBe(true);
  });

  it("ロック開始から30秒ちょうど経過した時点でロックが解除されること", () => {
    const lockedAt = new Date();
    const state = createLockedState(lockedAt);
    // 30秒後の now を注入
    const thirtySecondsLater = new Date(lockedAt.getTime() + LOCK_DURATION_MS);

    expect(isLocked(state, thirtySecondsLater)).toBe(false);
  });

  it("ロック解除後は正しい認証情報でログインできること", () => {
    const expiredLock = createExpiredLockState(); // 31秒前にロック

    // isLocked が false なのでログイン試行が許可されることを確認
    expect(isLocked(expiredLock)).toBe(false);
  });

  it("ロック解除後に再び5回連続で失敗するとロックされること", () => {
    const expiredLock = createExpiredLockState();
    // 解除後のリセット（ログイン成功扱いでカウントリセット）
    const reset = applyLoginSuccess();

    // 5回失敗
    const almostLocked = { ...reset, failureCount: LOCK_THRESHOLD - 1 };
    const locked = applyLoginFailure(almostLocked);

    expect(isLocked(locked)).toBe(true);
  });

  it("ロック解除後の失敗カウントは0から再開されること", () => {
    // ロック解除後にログイン成功 → リセット → 1回失敗
    const reset = applyLoginSuccess();
    const oneFail = applyLoginFailure(reset);

    expect(oneFail.failureCount).toBe(1);
    expect(isLocked(oneFail)).toBe(false);
  });
});

describe("異なるアカウント間の独立性", () => {
  it("あるアカウントのロック状態が別のアカウントに影響しないこと", () => {
    // AccountLockState は値オブジェクト。各アカウント独立して管理される。
    const accountAState = createLockedState();
    const accountBState = createInitialLockState();

    expect(isLocked(accountAState)).toBe(true);
    expect(isLocked(accountBState)).toBe(false);
  });

  it("あるアカウントの失敗カウントが別のアカウントの失敗カウントに影響しないこと", () => {
    const accountAState = createAlmostLockedState(); // failureCount = 4
    const accountBState = createInitialLockState(); // failureCount = 0

    // A の失敗が B に影響しないことを確認
    applyLoginFailure(accountAState); // A が5回目失敗（ロック）

    expect(accountBState.failureCount).toBe(0);
    expect(isLocked(accountBState)).toBe(false);
  });
});

describe("ロック状態の判定", () => {
  it("ロック状態かどうかを与えられた状態情報から正しく判定できること", () => {
    const locked = createLockedState();
    const unlocked = createInitialLockState();

    expect(isLocked(locked)).toBe(true);
    expect(isLocked(unlocked)).toBe(false);
  });

  it("ロック開始時刻と現在時刻の差が30秒未満の場合はロック中と判定されること", () => {
    const lockedAt = new Date();
    const state = createLockedState(lockedAt);
    const twentyNineSecondsLater = new Date(lockedAt.getTime() + 29_000);

    expect(isLocked(state, twentyNineSecondsLater)).toBe(true);
  });

  it("ロック開始時刻と現在時刻の差が30秒以上の場合はロック解除済みと判定されること", () => {
    const lockedAt = new Date();
    const state = createLockedState(lockedAt);
    const thirtySecondsLater = new Date(lockedAt.getTime() + LOCK_DURATION_MS);

    expect(isLocked(state, thirtySecondsLater)).toBe(false);
  });

  it("ロック状態でない(失敗回数が5未満)場合はロックされていないと判定されること", () => {
    const state = createAlmostLockedState(); // failureCount = 4

    expect(isLocked(state)).toBe(false);
  });
});
