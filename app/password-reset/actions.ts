"use server";

import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { validatePasswordResetForm } from "@/lib/auth/validation";
import { sendPasswordResetEmail } from "@/lib/mail";

export type PasswordResetState = {
  fieldErrors?: { email?: string[] };
  success?: boolean;
  error?: string;
} | null;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function requestPasswordResetAction(
  _prevState: PasswordResetState,
  formData: FormData
): Promise<PasswordResetState> {
  const data = { email: (formData.get("email") as string) ?? "" };

  // 1. バリデーション
  const result = validatePasswordResetForm(data);
  if (!result.success) {
    return { fieldErrors: result.error.flatten().fieldErrors };
  }

  const { email } = result.data;

  // 2. ユーザ検索（存在しなくても同一レスポンスを返す）
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (user) {
    // 3. リセットトークン生成（URLにはraw、DBにはハッシュを保存）
    const rawToken = randomBytes(32).toString("hex");
    const hashedToken = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1時間後

    // 既存の未使用トークンを無効化して新しいトークンを作成
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    });
    await prisma.passwordResetToken.create({
      data: { token: hashedToken, userId: user.id, expiresAt },
    });

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const resetUrl = `${baseUrl}/password-reset/${rawToken}`;

    await sendPasswordResetEmail(email, resetUrl);
  }

  // 4. セキュリティ上、メール存在有無に関わらず同一レスポンス
  return { success: true };
}
