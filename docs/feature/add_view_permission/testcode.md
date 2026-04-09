# テストコード実装メモ — 閲覧権限機能 (add_view_permission)

## 実装ファイル

| ファイル | 変更種別 | 内容 |
|---|---|---|
| `lib/users/permission.ts` | 更新 | `ViewMode` 型・`ViewPermission` 型・新関数4件を追加 |
| `src/test-utils/users.ts` | 更新 | `ViewPermission` 型エクスポート・`buildViewPermission` / `buildViewPermissionInCluster` を追加 |
| `__tests__/users/permission.test.ts` | 更新 | 55件のテストケースを追記 |

## `lib/users/permission.ts` に追加した関数

| 関数 | シグネチャ | 概要 |
|---|---|---|
| `canViewService` | `(role, viewMode, viewPermissions, operationPermissions, serviceArn) => boolean` | 単一サービスの閲覧可否を判定 |
| `filterServicesByView` | `(services, role, viewMode, viewPermissions, operationPermissions) => ServiceInfo[]` | リスト全体を閲覧権限でフィルタ |
| `addViewPermissions` | `(current, toAdd) => ViewPermission[]` | 閲覧権限を追加（重複排除付き） |
| `removeViewPermissions` | `(current, toRemove) => ViewPermission[]` | 閲覧権限を削除 |

## テスト結果

```
__tests__/users/permission.test.ts  99 tests passed (既存44 + 新規55)
```

## 注意点

- `mutations.test.ts` / `queries.test.ts` の失敗は DB 未接続によるもので今回の変更とは無関係（既存の既知の状態）
- `ViewPermission` は `ServicePermission` と同じフィールド構造を持つが、役割を明確にするため別型として定義
- `SYNC` モードは `operationPermissions` を参照するため、Viewer に設定した場合は全サービス閲覧不可（Viewer に操作権限は付与されない仕様）
