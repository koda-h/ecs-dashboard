---
name: project_ecs_dashboard
description: ECS Dashboard アプリの技術スタック・構成・デプロイ概要
type: project
---

## 技術スタック
- Next.js 16.2.1 (App Router), React 19, TypeScript strict
- Tailwind CSS v4, shadcn/ui コンポーネント (components/ui/)
- AWS SDK v3 (@aws-sdk/client-ecs)
- Prisma v6 + PostgreSQL (認証DB)
- jose v6 (JWT セッション)
- bcryptjs (パスワードハッシュ)
- nodemailer (メール送信)
- zod v3 (バリデーション)
- Vitest v3 (テスト)

## 認証機能 (実装済み)
- ユーザ登録 `/register` → `app/register/`
- ログイン `/login` → `app/login/`
- ログアウト Server Action → `app/actions/logout.ts`
- パスワードリセット `/password-reset` + `/password-reset/[token]`
- middleware.ts で未認証リダイレクト + スライディングセッション(24時間)
- アカウントロック: 5回失敗→30秒ロック (`lib/auth/account-lock.ts`)
- セッション: JWT in httpOnly Cookie (`lib/auth/session.ts`, `lib/auth/cookies.ts`)

## ディレクトリ構成
- `lib/auth/` - validation, session, cookies, password, account-lock, guard
- `lib/db.ts` - Prisma クライアントシングルトン
- `lib/mail.ts` - nodemailer (local: mailcatcher, port 1025)
- `middleware.ts` - 認証ガード (Edge 互換)
- `prisma/schema.prisma` - User, AccountLock, PasswordResetToken
- `__tests__/` - Vitest テスト (138 passed, 1 skipped)
- `src/test-utils/auth.ts` - テストユーティリティ

## ローカル開発
- docker-compose up → PostgreSQL(5432) + Mailcatcher(1025/SMTP, 1080/Web UI)
- `.env.local` に DATABASE_URL, JWT_SECRET, SMTP_* を設定済み
- `npx prisma migrate dev` でマイグレーション実行が必要
- `npm run dev` でアプリ起動

## Why
インターナル ECS 管理ツールに認証を追加。ALBレベルのアクセス制御に加えてアプリレベルの認証を実装。
