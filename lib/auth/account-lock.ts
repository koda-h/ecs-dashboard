export const LOCK_THRESHOLD = 5; // 5回連続失敗でロック
export const LOCK_DURATION_MS = 30_000; // 30秒間ロック

export interface AccountLockState {
  failureCount: number;
  lockedAt: Date | null;
}

/** 初期状態を返す */
export function createInitialLockState(): AccountLockState {
  return { failureCount: 0, lockedAt: null };
}

/** ロック開始から30秒が経過しているか */
export function isLockExpired(
  state: AccountLockState,
  now: Date = new Date()
): boolean {
  if (state.lockedAt === null) return true;
  return now.getTime() - state.lockedAt.getTime() >= LOCK_DURATION_MS;
}

/** 現在ロック中か */
export function isLocked(
  state: AccountLockState,
  now: Date = new Date()
): boolean {
  if (state.failureCount < LOCK_THRESHOLD) return false;
  if (state.lockedAt === null) return false;
  return !isLockExpired(state, now);
}

/** ログイン失敗を適用し、新しい状態を返す（純粋関数） */
export function applyLoginFailure(
  state: AccountLockState,
  now: Date = new Date()
): AccountLockState {
  const newCount = state.failureCount + 1;
  // 初めてロック閾値に達した場合のみ lockedAt を設定する
  if (newCount >= LOCK_THRESHOLD && state.lockedAt === null) {
    return { failureCount: newCount, lockedAt: now };
  }
  return { failureCount: newCount, lockedAt: state.lockedAt };
}

/** ログイン成功を適用し、失敗カウントをリセットした状態を返す（純粋関数） */
export function applyLoginSuccess(): AccountLockState {
  return { failureCount: 0, lockedAt: null };
}

/** ロック解除までの残り時間（ms）を返す。ロック中でなければ 0 */
export function getRemainingLockTime(
  state: AccountLockState,
  now: Date = new Date()
): number {
  if (!isLocked(state, now)) return 0;
  return LOCK_DURATION_MS - (now.getTime() - state.lockedAt!.getTime());
}
