# Code Review

- Review time: 2026-04-05 19:20 +0900
- Base branch: main
- Current branch: feature/add_manage_view
- Merge base: 819400d
- Reviewed commit pairs: 2
- Remaining commit pairs: 0
- Threshold: low
- Saved path: docs/code_review/feature-add_manage_view_202604051920.md

## Findings

### High

1. `9e2c7772` -> `a42ad147`
   - [未修正][high] `prisma/migrations/20260405092420_add_user_role_and_service_permissions/migration.sql:5`, `app/register/actions.ts:67`, `middleware.ts:27`
     既存 `User` 全件へ `role = Viewer` を付与する migration のまま本番適用すると、既存管理者も含めて全員が Viewer に降格します。しかも新規登録も Viewer 固定で、`/users` は Admin でないと入れないため、デプロイ直後に Admin が 0 人になると権限を復旧する導線がなくなります。
     変更前 / 変更後:
     ```diff
     +-- CreateEnum
     +CREATE TYPE "UserRole" AS ENUM ('Admin', 'Editor', 'Viewer');
     +
     +-- AlterTable
     +ALTER TABLE "User" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'Viewer';
     ```
     最新コミットでの状態: 未修正

2. `9e2c7772` -> `a42ad147`
   - [未修正][high] `app/api/services/update/route.ts:4`, `middleware.ts:27`, `lib/users/permission.ts:71`
     ロールとサービス単位の権限モデルを追加した一方で、ECS 更新 API は現在もセッション・ロール・付与済み権限を一切確認していません。結果として Viewer でも、対象サービス権限を持たない Editor でも `/api/services/update` を直接呼べば任意サービスを起動・停止・スケールできます。UI 上の制御だけでは防げないため、権限制御として成立していません。
     変更前 / 変更後:
     ```diff
     -  await setSessionCookie(user.userId);
     +  await setSessionCookie(user.userId, user.role);
     
     -  const decision = getRedirectDecision(pathname, isAuthenticated);
     +  const decision = getRedirectDecisionWithRole(pathname, isAuthenticated, userRole);
     ```
     最新コミットでの状態: 未修正

### Middle

1. `9e2c7772` -> `a42ad147`
   - [未修正][middle] `app/users/[id]/UserDetailClient.tsx:103`, `app/api/services/route.ts:6`
     権限追加ダイアログの「クラスタ名でフィルタ」はクラスタ名の部分一致入力を受ける UI なのに、入力値をそのまま `cluster` クエリへ積んでいます。`/api/services` 側はこれをクラスタ ARN として扱うため、`prod` のような人間向け名称を入れると `listServicesForCluster("prod")` が呼ばれて取得失敗になります。非空のクラスタフィルタを入れた状態でダイアログを開くと、サービス一覧を取得できず権限付与作業が止まります。
     変更前 / 変更後:
     ```diff
     +      const params = new URLSearchParams();
     +      if (clusterFilter) params.set("cluster", clusterFilter);
     +      if (serviceFilter) params.set("service", serviceFilter);
     +      const res = await fetch(`/api/services?${params.toString()}`);
     ```
     最新コミットでの状態: 未修正

2. `9e2c7772` -> `a42ad147`
   - [未修正][middle] `app/users/[id]/page.tsx:15`, `app/api/users/[id]/route.ts:39`, `app/api/users/[id]/route.ts:83`
     自分自身の保護ロジックが、コメントや `lib/users/role.ts` の設計意図に反して内部 ID ではなく可変の表示用 `userId` 比較に依存しています。別の Admin が先にあなたの `userId` を変更した既存セッションでは `session.userId !== target.userId` になり、自己アカウントでも画面上の `isSelf` 判定が外れ、API 側の自己削除・自己ロール変更禁止も素通りします。複数管理者運用で誤操作防止が破綻します。
     変更前 / 変更後:
     ```diff
     +  const isSelf = session?.userId === user.userId;
     
     +  if (role !== undefined && session.userId === currentUser.userId) {
     +    if (!canChangeRole(session.userId, currentUser.userId)) {
     +      return NextResponse.json(
     +        { error: "自分自身のロールは変更できません" },
     +        { status: 403 }
     +      );
     +    }
     +  }
     ```
     最新コミットでの状態: 未修正

## Out Of Scope

- なし

## Notes

- `develop` ブランチがこのリポジトリに存在しなかったため、レビュー基準ブランチは `main` に読み替えて確認した。
- `819400d8` -> `9e2c7772` では、今回の閾値では指摘事項なし。
- スクリプト `scripts/list_review_ranges.sh` / `scripts/build_report_path.sh` はリポジトリ内に存在しなかったため、同等の Git 情報から手動でレビュー順序と保存先を解決した。
- テスト実行は行っていない。
