"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { validateRegisterForm } from "@/lib/auth/validation";
import { hashPassword } from "@/lib/auth/password";
import { setSessionCookie } from "@/lib/auth/cookies";

export type RegisterState = {
  fieldErrors?: {
    userId?: string[];
    email?: string[];
    password?: string[];
    passwordConfirm?: string[];
  };
  error?: string;
  // エラー時にフォーム値を復元するために返す（パスワードは除く）
  values?: {
    userId: string;
    email: string;
  };
} | null;

export async function registerAction(
  _prevState: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const data = {
    userId: (formData.get("userId") as string) ?? "",
    email: (formData.get("email") as string) ?? "",
    password: (formData.get("password") as string) ?? "",
    passwordConfirm: (formData.get("passwordConfirm") as string) ?? "",
  };

  const values = { userId: data.userId, email: data.email };

  // 1. バリデーション
  const result = validateRegisterForm(data);
  if (!result.success) {
    return { fieldErrors: result.error.flatten().fieldErrors, values };
  }

  const { userId, email, password } = result.data;

  // 2. 重複チェック（userId / email）
  const existing = await prisma.user.findFirst({
    where: { OR: [{ userId }, { email }] },
    select: { userId: true, email: true },
  });

  if (existing) {
    return {
      fieldErrors: {
        userId:
          existing.userId === userId
            ? ["このユーザIDはすでに使用されています"]
            : undefined,
        email:
          existing.email === email
            ? ["このメールアドレスはすでに登録されています"]
            : undefined,
      },
      values,
    };
  }

  // 3. パスワードハッシュ化 & ユーザ作成（登録時は Viewer ロール）
  const hashedPassword = await hashPassword(password);
  const user = await prisma.user.create({
    data: { userId, email, password: hashedPassword, role: "Viewer" },
    select: { userId: true, role: true },
  });

  // 4. セッションCookieをセット（ロールを含める）
  await setSessionCookie(user.userId, user.role);

  // 5. サービス一覧へリダイレクト
  redirect("/");
}
