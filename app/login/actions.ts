"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { validateLoginForm } from "@/lib/auth/validation";
import { verifyPassword } from "@/lib/auth/password";
import { setSessionCookie } from "@/lib/auth/cookies";
import {
  isLocked,
  applyLoginFailure,
  applyLoginSuccess,
  getRemainingLockTime,
  AccountLockState,
} from "@/lib/auth/account-lock";

export type LoginState = {
  fieldErrors?: {
    loginId?: string[];
    password?: string[];
  };
  error?: string;
} | null;

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const data = {
    loginId: (formData.get("loginId") as string) ?? "",
    password: (formData.get("password") as string) ?? "",
  };

  // 1. フォームバリデーション
  const result = validateLoginForm(data);
  if (!result.success) {
    return { fieldErrors: result.error.flatten().fieldErrors };
  }

  const { loginId, password } = result.data;

  // 2. ユーザ検索（userId または email）
  const user = await prisma.user.findFirst({
    where: { OR: [{ userId: loginId }, { email: loginId }] },
    include: { accountLock: true },
  });

  // ユーザが存在しない場合も同一メッセージを返す（ユーザ存在有無の漏洩防止）
  if (!user) {
    return { error: "IDまたはパスワードが正しくありません" };
  }

  // 3. アカウントロック確認
  const lockState: AccountLockState = {
    failureCount: user.accountLock?.failureCount ?? 0,
    lockedAt: user.accountLock?.lockedAt ?? null,
  };

  if (isLocked(lockState)) {
    const remainingSec = Math.ceil(getRemainingLockTime(lockState) / 1000);
    return {
      error: `アカウントがロックされています。${remainingSec}秒後に再試行してください。`,
    };
  }

  // 4. パスワード検証
  const isValid = await verifyPassword(password, user.password);

  if (!isValid) {
    const newLockState = applyLoginFailure(lockState);
    await prisma.accountLock.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        failureCount: newLockState.failureCount,
        lockedAt: newLockState.lockedAt,
      },
      update: {
        failureCount: newLockState.failureCount,
        lockedAt: newLockState.lockedAt,
      },
    });

    if (isLocked(newLockState)) {
      return {
        error: "ログインに5回失敗しました。30秒間ロックされます。",
      };
    }

    return { error: "IDまたはパスワードが正しくありません" };
  }

  // 5. ログイン成功 → 失敗カウントリセット
  const resetState = applyLoginSuccess();
  if (user.accountLock) {
    await prisma.accountLock.update({
      where: { userId: user.id },
      data: {
        failureCount: resetState.failureCount,
        lockedAt: resetState.lockedAt,
      },
    });
  }

  // 6. セッションCookieをセット（ユーザの表示用IDとロールを格納）
  await setSessionCookie(user.userId, user.role);

  // 7. サービス一覧へリダイレクト
  redirect("/");
}
