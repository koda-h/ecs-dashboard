"use server";

import { createHash } from "crypto";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { passwordSchema } from "@/lib/auth/validation";

export type ResetPasswordState = {
  fieldErrors?: { password?: string[]; passwordConfirm?: string[] };
  error?: string;
} | null;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function resetPasswordAction(
  token: string,
  _prevState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const password = (formData.get("password") as string) ?? "";
  const passwordConfirm = (formData.get("passwordConfirm") as string) ?? "";

  // 1. パスワードバリデーション
  const passwordResult = passwordSchema.safeParse(password);
  if (!passwordResult.success) {
    return {
      fieldErrors: { password: passwordResult.error.issues.map((i) => i.message) },
    };
  }

  if (password !== passwordConfirm) {
    return { fieldErrors: { passwordConfirm: ["パスワードが一致しません"] } };
  }

  // 2. トークン検証
  const hashedToken = hashToken(token);
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token: hashedToken },
  });

  if (!resetToken) {
    return { error: "無効なリセットリンクです。再度パスワードリセットを申請してください。" };
  }

  if (resetToken.usedAt !== null) {
    return { error: "このリセットリンクはすでに使用済みです。" };
  }

  if (resetToken.expiresAt < new Date()) {
    return { error: "リセットリンクの有効期限が切れています。再度申請してください。" };
  }

  // 3. パスワード更新 & トークン無効化（トランザクション）
  const hashedPassword = await hashPassword(password);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { password: hashedPassword },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
  ]);

  redirect("/login?reset=success");
}
