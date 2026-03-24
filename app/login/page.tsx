"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { loginAction, LoginState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function LoginForm() {
  const searchParams = useSearchParams();
  const isResetSuccess = searchParams.get("reset") === "success";

  const [state, formAction, isPending] = useActionState<LoginState, FormData>(
    loginAction,
    null
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-6 bg-popover text-popover-foreground rounded-lg shadow-md border border-border">
        <h1 className="text-2xl font-bold text-center text-foreground">
          ログイン
        </h1>

        {isResetSuccess && (
          <div className="p-3 text-sm text-green-700 bg-green-50 rounded-md border border-green-200">
            パスワードを再設定しました。新しいパスワードでログインしてください。
          </div>
        )}

        {state?.error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
            {state.error}
          </div>
        )}

        <form action={formAction} className="space-y-4">
          <div>
            <label
              htmlFor="loginId"
              className="block text-sm font-medium text-foreground mb-1"
            >
              ユーザID / メールアドレス
            </label>
            <Input
              id="loginId"
              name="loginId"
              type="text"
              autoComplete="username"
              placeholder="my-user_id または user@example.com"
              aria-describedby="loginId-error"
            />
            {state?.fieldErrors?.loginId && (
              <p id="loginId-error" className="mt-1 text-sm text-red-600">
                {state.fieldErrors.loginId[0]}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-foreground mb-1"
            >
              パスワード
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              aria-describedby="password-error"
            />
            {state?.fieldErrors?.password && (
              <p id="password-error" className="mt-1 text-sm text-red-600">
                {state.fieldErrors.password[0]}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50" disabled={isPending}>
            {isPending ? "ログイン中..." : "ログイン"}
          </Button>
        </form>

        <div className="text-center text-sm space-y-2">
          <div>
            <Link
              href="/password-reset"
              className="text-blue-600 hover:underline"
            >
              パスワードをお忘れの方はこちら
            </Link>
          </div>
          <div className="text-muted-foreground">
            アカウントをお持ちでない方は{" "}
            <Link
              href="/register"
              className="text-blue-600 hover:underline font-medium"
            >
              新規登録
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
