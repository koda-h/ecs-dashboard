# ECS Dashboard - 実装計画

## 概要

AWS ECS サービスの起動・停止を管理するための Web アプリケーション。
Next.js + TypeScript で実装し、AWS ECS 上で稼働する。

---

## 技術スタック

| カテゴリ | 採用技術 |
|---|---|
| フレームワーク | Next.js 15 (App Router) |
| 言語 | TypeScript |
| UI コンポーネント | shadcn/ui (Tailwind CSS ベース) |
| AWS SDK | @aws-sdk/client-ecs |
| 状態管理 | React の useState / useEffect（軽量のため外部ライブラリ不使用） |
| ポーリング | SWR（自動更新・再検証） |
| コンテナ | Docker |
| デプロイ | genova |

---

## アーキテクチャ

```
ブラウザ
  ↓ HTTP
Next.js (ECS上で稼働)
  ├── /app/page.tsx              サービス一覧画面
  └── /app/api/
        ├── clusters/route.ts    クラスター一覧取得
        ├── services/route.ts    サービス一覧取得
        └── services/[cluster]/[service]/route.ts  起動・停止
              ↓ AWS SDK (IAMロール認証)
            AWS ECS API
```

- バックエンドは **Next.js API Routes** で完結（別サービス不要）
- ECS タスクに付与した **IAM ロール** で自動認証（アクセスキー不要）
- AWS SDK は ECS メタデータエンドポイント経由で認証情報を自動取得

---

## 機能一覧

### 1. サービス一覧表示

- 全クラスターのサービスを一覧表示
- 表示項目：
  - サービス名
  - クラスター名
  - ステータスラベル（後述）
  - Running / Desired タスク数
  - 起動・停止ボタン

### 2. 絞り込み

- クラスタードロップダウンで絞り込み
- サービス名のフリーワード検索（前方一致・部分一致）

### 3. ステータスラベル

| 状態 | ラベル | 色 |
|---|---|---|
| desired=0 かつ running=0 | 停止中 | グレー |
| desired≥1 かつ running=desired | 起動中 | グリーン |
| desired≥1 かつ running<desired | 起動処理中 | イエロー |
| desired=0 かつ running≥1 | 停止処理中 | オレンジ |

### 4. 起動・停止ボタン

- 停止中のサービス → 「起動」ボタン表示
- 起動中のサービス → 「停止」ボタン表示
- 処理中（起動処理中・停止処理中）→ ボタン無効化 + スピナー表示
- 操作前に確認ダイアログを表示（誤操作防止）

### 5. サービスの起動

- 数値入力フィールド（デフォルト: 1、最小: 1）で desired count を指定
- `UpdateService` API で指定した数に変更

### 6. サービスの停止

- `UpdateService` API で `desiredCount = 0` に変更

### 7. Desired Count の変更（起動中のサービス）

- 起動中サービスの行に数値入力フィールドを表示
- 「変更」ボタンで `UpdateService` を実行

### 7. 自動ポーリング

- **30秒ごと**に一覧を自動更新（SWR の refreshInterval）
- 操作後は即座に再フェッチして最新状態を反映
- 処理中のサービスがある場合は **10秒ごと**に更新（動的間隔）

---

## 追加機能（確定）

| 機能 | 内容 |
|---|---|
| **エラートースト通知** | API エラー時（権限不足・ネットワーク断など）をトーストで表示 |
| **Desired Count 指定 UI** | 起動時にタスク数を指定できる数値入力（デフォルト: 1、最小: 1）。起動中のサービスも同様に変更可能 |

## 非採用機能

| 機能 | 理由 |
|---|---|
| 確認ダイアログ | 不要 |
| リージョン切り替え | 不要。`AWS_REGION` 環境変数で固定 |

---

## ディレクトリ構成

```
ecs-dashboard/
├── Dockerfile
├── docker-compose.yml          # ローカル開発用
├── config/
│   ├── deploy.yml              # genova 設定
│   └── deploy/
│       └── app.yml             # ECS タスク定義
├── src/
│   └── app/
│       ├── layout.tsx
│       ├── page.tsx            # サービス一覧画面
│       ├── components/
│       │   ├── ServiceTable.tsx
│       │   ├── ServiceRow.tsx
│       │   ├── StatusBadge.tsx
│       │   ├── ClusterFilter.tsx
│       │   ├── SearchFilter.tsx
│       │   └── ConfirmDialog.tsx
│       └── api/
│           ├── clusters/
│           │   └── route.ts
│           └── services/
│               ├── route.ts
│               └── [cluster]/
│                   └── [service]/
│                       └── route.ts
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.ts
```

---

## IAM ポリシー（ECS タスクロールに付与が必要）

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecs:ListClusters",
        "ecs:ListServices",
        "ecs:DescribeServices",
        "ecs:UpdateService"
      ],
      "Resource": "*"
    }
  ]
}
```

---

## 環境変数

| 変数名 | 説明 | デフォルト |
|---|---|---|
| `AWS_REGION` | 対象 AWS リージョン | `ap-northeast-1` |
| `PORT` | アプリのポート番号 | `3000` |

### 認証

- **ECS 上**: タスクロールによる自動認証（アクセスキー不要）
- **ローカル開発**: `aws sso login` 後の SSO プロファイルを AWS SDK が自動検出

---

## genova 設定方針

- `config/deploy.yml` にサービス定義を記述
- タスク定義 (`config/deploy/app.yml`) で IAM タスクロール ARN を指定
- ポート 3000 を ALB 経由で公開（アクセス制限は ALB レベルで実施推奨）

---

## 実装ステップ

1. [ ] Next.js プロジェクトの初期化（TypeScript + Tailwind + shadcn/ui）
2. [ ] AWS SDK の設定・API Routes の実装
   - クラスター一覧取得
   - サービス一覧取得
   - 起動・停止
3. [ ] UI コンポーネントの実装
   - サービステーブル
   - ステータスバッジ
   - 絞り込みフィルター
   - 確認ダイアログ
4. [ ] SWR による自動ポーリング
5. [ ] Dockerfile + docker-compose.yml の作成
6. [ ] genova 設定ファイルの作成（`config/deploy.yml`, `config/deploy/app.yml`）
7. [ ] ローカル動作確認
8. [ ] ECS デプロイ
