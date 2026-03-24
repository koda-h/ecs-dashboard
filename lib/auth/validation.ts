import { z } from "zod";

// ユーザID: 半角英数・ハイフン・アンダーバーのみ、3〜50文字
// 先頭・末尾はハイフン・アンダーバー禁止
export const userIdSchema = z
  .string({ required_error: "ユーザIDを入力してください" })
  .min(3, "ユーザIDは3文字以上で入力してください")
  .max(50, "ユーザIDは50文字以下で入力してください")
  .regex(
    /^[a-zA-Z0-9][a-zA-Z0-9\-_]*[a-zA-Z0-9]$/,
    "ユーザIDは半角英数字、ハイフン、アンダーバーのみ使用できます。先頭・末尾にハイフン・アンダーバーは使用できません"
  );

export const emailSchema = z
  .string({ required_error: "メールアドレスを入力してください" })
  .min(1, "メールアドレスを入力してください")
  .email("メールアドレスの形式が正しくありません");

// パスワード: 12〜80文字、英字1文字以上・数字1文字以上必須
export const passwordSchema = z
  .string({ required_error: "パスワードを入力してください" })
  .min(12, "パスワードは12文字以上で入力してください")
  .max(80, "パスワードは80文字以下で入力してください")
  .regex(/[a-zA-Z]/, "パスワードには英字を1文字以上含めてください")
  .regex(/[0-9]/, "パスワードには数字を1文字以上含めてください");

// ログインID: ユーザIDまたはメールアドレスの形式
export const loginIdSchema = z
  .string({ required_error: "IDを入力してください" })
  .min(1, "IDを入力してください")
  .refine(
    (value) =>
      emailSchema.safeParse(value).success ||
      userIdSchema.safeParse(value).success,
    { message: "ユーザIDまたはメールアドレスを入力してください" }
  );

export const registerFormSchema = z
  .object({
    userId: userIdSchema,
    email: emailSchema,
    password: passwordSchema,
    passwordConfirm: z
      .string({ required_error: "パスワード確認を入力してください" })
      .min(1, "パスワード確認を入力してください"),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "パスワードが一致しません",
    path: ["passwordConfirm"],
  });

export const loginFormSchema = z.object({
  loginId: loginIdSchema,
  password: z
    .string({ required_error: "パスワードを入力してください" })
    .min(1, "パスワードを入力してください"),
});

export const passwordResetFormSchema = z.object({
  email: emailSchema,
});

// --- ヘルパー関数 ---

export function validateUserId(value: string) {
  return userIdSchema.safeParse(value);
}

export function validateEmail(value: string) {
  return emailSchema.safeParse(value);
}

export function validatePassword(value: string) {
  return passwordSchema.safeParse(value);
}

export function validatePasswordConfirm(password: string, confirm: string) {
  return z
    .string()
    .min(1, "パスワード確認を入力してください")
    .refine((v) => v === password, "パスワードが一致しません")
    .safeParse(confirm);
}

export function validateLoginId(value: string) {
  return loginIdSchema.safeParse(value);
}

export function validateRegisterForm(data: {
  userId: string;
  email: string;
  password: string;
  passwordConfirm: string;
}) {
  return registerFormSchema.safeParse(data);
}

export function validateLoginForm(data: { loginId: string; password: string }) {
  return loginFormSchema.safeParse(data);
}

export function validatePasswordResetForm(data: { email: string }) {
  return passwordResetFormSchema.safeParse(data);
}
