"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordResetAction, PasswordResetState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function PasswordResetPage() {
  const [state, formAction, isPending] = useActionState<
    PasswordResetState,
    FormData
  >(requestPasswordResetAction, null);

  if (state?.success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-md p-8 space-y-6 bg-popover text-popover-foreground rounded-lg shadow-md border border-border text-center">
          <h1 className="text-2xl font-bold text-foreground">メールを送信しました</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            入力したメールアドレスにパスワードリセット用のリンクを送信しました。
            <br />
            メールが届かない場合は迷惑メールフォルダをご確認ください。
          </p>
          <Link
            href="/login"
            className="inline-block text-blue-600 hover:underline text-sm"
          >
            ログインページに戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-6 bg-popover text-popover-foreground rounded-lg shadow-md border border-border">
        <div>
          <h1 className="text-2xl font-bold text-center text-foreground">
            パスワードリセット
          </h1>
          <p className="mt-2 text-sm text-center text-muted-foreground">
            登録したメールアドレスを入力してください。
            パスワードリセット用のリンクをお送りします。
          </p>
        </div>

        {state?.error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
            {state.error}
          </div>
        )}

        <form action={formAction} className="space-y-4">
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
              aria-describedby="email-error"
            />
            {state?.fieldErrors?.email && (
              <p id="email-error" className="mt-1 text-sm text-red-600">
                {state.fieldErrors.email[0]}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50" disabled={isPending}>
            {isPending ? "送信中..." : "メール送信"}
          </Button>
        </form>

        <p className="text-center text-sm">
          <Link href="/login" className="text-blue-600 hover:underline">
            ログインページに戻る
          </Link>
        </p>
      </div>
    </div>
  );
}
