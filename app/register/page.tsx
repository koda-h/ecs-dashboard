"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction, RegisterState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState<RegisterState, FormData>(
    registerAction,
    null
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-6 bg-popover text-popover-foreground rounded-lg shadow-md border border-border">
        <h1 className="text-2xl font-bold text-center text-foreground">
          新規ユーザ登録
        </h1>

        {state?.error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
            {state.error}
          </div>
        )}

        <form action={formAction} className="space-y-4">
          <div>
            <label
              htmlFor="userId"
              className="block text-sm font-medium text-foreground mb-1"
            >
              ユーザID
              <span className="ml-1 text-xs text-muted-foreground">
                (3〜50文字・半角英数字・ハイフン・アンダーバー)
              </span>
            </label>
            <Input
              id="userId"
              name="userId"
              type="text"
              autoComplete="username"
              placeholder="my-user_id"
              defaultValue={state?.values?.userId ?? ""}
              aria-describedby="userId-error"
            />
            {state?.fieldErrors?.userId && (
              <p id="userId-error" className="mt-1 text-sm text-red-600">
                {state.fieldErrors.userId[0]}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-foreground mb-1"
            >
              メールアドレス
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="user@example.com"
              defaultValue={state?.values?.email ?? ""}
              aria-describedby="email-error"
            />
            {state?.fieldErrors?.email && (
              <p id="email-error" className="mt-1 text-sm text-red-600">
                {state.fieldErrors.email[0]}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-foreground mb-1"
            >
              パスワード
              <span className="ml-1 text-xs text-muted-foreground">
                (12〜80文字・英字と数字を各1文字以上含む)
              </span>
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              aria-describedby="password-error"
            />
            {state?.fieldErrors?.password && (
              <ul id="password-error" className="mt-1 text-sm text-red-600 space-y-1">
                {state.fieldErrors.password.map((msg) => (
                  <li key={msg}>{msg}</li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label
              htmlFor="passwordConfirm"
              className="block text-sm font-medium text-foreground mb-1"
            >
              パスワード確認
            </label>
            <Input
              id="passwordConfirm"
              name="passwordConfirm"
              type="password"
              autoComplete="new-password"
              aria-describedby="passwordConfirm-error"
            />
            {state?.fieldErrors?.passwordConfirm && (
              <p id="passwordConfirm-error" className="mt-1 text-sm text-red-600">
                {state.fieldErrors.passwordConfirm[0]}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            disabled={isPending}
          >
            {isPending ? "登録中..." : "登録"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          すでにアカウントをお持ちの方は{" "}
          <Link href="/login" className="text-blue-600 hover:underline font-medium">
            ログイン
          </Link>
        </p>
      </div>
    </div>
  );
}
