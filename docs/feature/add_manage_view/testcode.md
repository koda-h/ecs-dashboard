# テストコード実装まとめ — ユーザ管理機能 (add_manage_view)

## 実施内容

### 新規実装（プロダクションコード）

| ファイル | エクスポート |
|---|---|
| `lib/users/role.ts` | `UserRole`, `isValidRole`, `isAdmin`, `isEditor`, `isViewer`, `getDefaultRole`, `isSelf`, `canChangeRole`, `canDeleteUser` |
| `lib/users/permission.ts` | `ServicePermission`, `filterServicesForPermission`, `addServicePermissions`, `removeServicePermissions`, `canOperateService`, `canViewServices` |
| `lib/auth/guard.ts` | `isAdminRoute`, `getRedirectDecisionWithRole` を追記 |

### テストユーティリティ

| ファイル | 追加内容 |
|---|---|
| `src/test-utils/services.ts` | `buildServiceInCluster(clusterName, serviceName)` を追加 |
| `src/test-utils/users.ts` | `buildServicePermission`, `buildServicePermissionInCluster` を新規作成 |

---

## テスト実装ファイル

### `__tests__/auth/guard.test.ts` — 追記分（17ケース）

**管理者専用ルートの分類**（6ケース）
- `/users`, `/users/[id]` が admin route として分類されること
- `/`, `/login`, `/register` は admin route ではないこと

**ロールを考慮したリダイレクト判定**（11ケース）
- 未認証 × `/users`, `/users/[id]` → `/login` へリダイレクト
- Viewer × `/users`, `/users/[id]` → `/` へリダイレクト
- Editor × `/users`, `/users/[id]` → `/` へリダイレクト
- Admin × `/users`, `/users/[id]` → アクセス許可
- Viewer / Editor / Admin × `/` → アクセス許可

---

### `__tests__/users/role.test.ts` — 26ケース

**ロールの有効性チェック**（9ケース）
- `"Admin"`, `"Editor"`, `"Viewer"` は有効
- 空文字、小文字表記、存在しないロール名、`null`, `undefined`, 数値は無効

**isAdmin / isEditor / isViewer**（各3ケース、計9ケース）
- 各関数の正引き1件・負引き2件

**デフォルトロール**（1ケース）
- `getDefaultRole()` は `"Viewer"` を返す

**isSelf**（3ケース）
- 同一ID → `true`
- 異なるID → `false`
- 片方が空文字 → `false`

**canChangeRole / canDeleteUser**（各2ケース、計4ケース）
- 別ユーザへの操作 → 許可
- 自分自身への操作 → 禁止

---

### `__tests__/users/permission.test.ts` — 44ケース

**filterServicesForPermission**（16ケース）

| describe | ケース数 | 主なケース |
|---|---|---|
| クラスター名フィルタ | 6 | 空リスト、空文字、部分一致、不一致、大文字小文字、前後スペース |
| サービス名フィルタ | 5 | 空文字、部分一致、不一致、大文字小文字、前後スペース |
| 複合フィルタ | 4 | AND条件、片方不一致×2、両方空文字 |
| 順序保持 | 1 | フィルタ後に元の順序が維持されること |

**addServicePermissions**（11ケース）

| describe | ケース数 | 主なケース |
|---|---|---|
| 基本追加 | 5 | 空リストへの追加、既存への追加、複数追加、既存が残ること、空リスト追加 |
| 重複排除 | 3 | 既存と重複、追加リスト内で重複、一部重複 |
| 順序 | 2 | 既存の順序維持、新規は末尾に追加 |

**removeServicePermissions**（8ケース）

| describe | ケース数 | 主なケース |
|---|---|---|
| 基本削除 | 3 | 1件削除、複数削除、残りが変化しないこと |
| 境界条件 | 4 | 存在しない要素、空リストから削除、空の削除リスト、全件削除 |
| 順序 | 1 | 削除後の残りが元の順序を保持すること |

**canOperateService**（7ケース）

| describe | ケース数 | 主なケース |
|---|---|---|
| Admin ロール | 2 | 権限リスト空でも操作可、リスト外でも操作可 |
| Editor ロール | 3 | リスト内は操作可、リスト外は不可、空リストは不可 |
| Viewer ロール | 2 | リスト内でも不可、空リストでも不可 |

**canViewServices**（3ケース）
- Admin / Editor / Viewer すべて閲覧可能

---

## UI実装ファイル（TDD完了分）

| ファイル | 内容 |
|---|---|
| `components/UserMenu.tsx` | ドロップダウンメニュー（ユーザID表示、ユーザ一覧リンク(Admin only)、ログアウト） |
| `app/page.tsx` | `LogoutButton` → `UserMenu` に差し替え |
| `app/users/page.tsx` | ユーザ一覧画面（Server Component、テーブル表示） |
| `app/users/[id]/page.tsx` | ユーザ詳細画面（Server Component ラッパー） |
| `app/users/[id]/UserDetailClient.tsx` | ユーザ詳細クライアント（userId編集、ロール変更、権限追加/削除、削除確認ダイアログ） |

---

## テスト結果

```
Test Files  11 passed (11)
     Tests  290 passed | 1 skipped (291)
```
