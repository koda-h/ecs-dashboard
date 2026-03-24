"use client";

import { useActionState } from "react";
import { use } from "react";
import Link from "next/link";
import { resetPasswordAction, ResetPasswordState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);

  const boundAction = resetPasswordAction.bind(null, token);
  const [state, formAction, isPending] = useActionState<
    ResetPasswordState,
    FormData
  >(boundAction, null);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-6 bg-popover text-popover-foreground rounded-lg shadow-md border border-border">
        <h1 className="text-2xl font-bold text-center text-foreground">
          新しいパスワードの設定
        </h1>

        {state?.error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
            {state.error}
            <div className="mt-2">
              <Link
                href="/password-reset"
                className="text-blue-600 hover:underline"
              >
                再度パスワードリセットを申請する
              </Link>
            </div>
          </div>
        )}

        <form action={formAction} className="space-y-4">
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-foreground mb-1"
            >
              新しいパスワード
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
              新しいパスワード確認
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

          <Button type="submit" className="w-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50" disabled={isPending}>
            {isPending ? "更新中..." : "パスワードを更新する"}
          </Button>
        </form>
      </div>
    </div>
  );
}
