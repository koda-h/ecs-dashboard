# テストケース一覧 — 閲覧権限機能 (add_view_permission)

## 対象テストファイル

| ファイル | 種別 | ケース数 |
|---|---|---|
| `__tests__/users/permission.test.ts` | 更新 | +52 |

---

## `__tests__/users/permission.test.ts` — 追記分

### canViewService — Admin ロール

| # | テストケース |
|---|---|
| 1 | Admin は viewMode が ALL のとき任意のサービスを閲覧できること |
| 2 | Admin は viewMode が SYNC のとき任意のサービスを閲覧できること |
| 3 | Admin は viewMode が CUSTOM のとき任意のサービスを閲覧できること |
| 4 | Admin は viewPermissions が空でも任意のサービスを閲覧できること |
| 5 | Admin は operationPermissions が空でも任意のサービスを閲覧できること |

### canViewService — Editor / viewMode: ALL

| # | テストケース |
|---|---|
| 6 | Editor で viewMode が ALL のとき、任意のサービスを閲覧できること |
| 7 | Editor で viewMode が ALL のとき、viewPermissions が空でも閲覧できること |
| 8 | Editor で viewMode が ALL のとき、operationPermissions が空でも閲覧できること |

### canViewService — Editor / viewMode: SYNC

| # | テストケース |
|---|---|
| 9 | Editor で viewMode が SYNC のとき、operationPermissions に含まれるサービスを閲覧できること |
| 10 | Editor で viewMode が SYNC のとき、operationPermissions に含まれないサービスは閲覧できないこと |
| 11 | Editor で viewMode が SYNC のとき、operationPermissions が空の場合どのサービスも閲覧できないこと |
| 12 | Editor で viewMode が SYNC のとき、viewPermissions の内容は無視されること |

### canViewService — Editor / viewMode: CUSTOM

| # | テストケース |
|---|---|
| 13 | Editor で viewMode が CUSTOM のとき、viewPermissions に含まれるサービスを閲覧できること |
| 14 | Editor で viewMode が CUSTOM のとき、viewPermissions に含まれないサービスは閲覧できないこと |
| 15 | Editor で viewMode が CUSTOM のとき、viewPermissions が空の場合どのサービスも閲覧できないこと |
| 16 | Editor で viewMode が CUSTOM のとき、operationPermissions の内容は無視されること |

### canViewService — Viewer / viewMode: ALL

| # | テストケース |
|---|---|
| 17 | Viewer で viewMode が ALL のとき、任意のサービスを閲覧できること |
| 18 | Viewer で viewMode が ALL のとき、viewPermissions が空でも閲覧できること |

### canViewService — Viewer / viewMode: CUSTOM

| # | テストケース |
|---|---|
| 19 | Viewer で viewMode が CUSTOM のとき、viewPermissions に含まれるサービスを閲覧できること |
| 20 | Viewer で viewMode が CUSTOM のとき、viewPermissions に含まれないサービスは閲覧できないこと |
| 21 | Viewer で viewMode が CUSTOM のとき、viewPermissions が空の場合どのサービスも閲覧できないこと |

### canViewService — Viewer / viewMode: SYNC（エッジケース）

| # | テストケース |
|---|---|
| 22 | Viewer で viewMode が SYNC のとき、operationPermissions は常に空のためどのサービスも閲覧できないこと |

---

### filterServicesByView — Admin ロール

| # | テストケース |
|---|---|
| 23 | Admin のとき、サービスリストがそのまま返ること |
| 24 | Admin のとき、viewMode・viewPermissions・operationPermissions の内容に関わらず全サービスが返ること |

### filterServicesByView — Editor / viewMode: ALL

| # | テストケース |
|---|---|
| 25 | viewMode が ALL のとき、サービスリストがそのまま返ること |
| 26 | viewMode が ALL のとき、サービスリストが空の場合空配列を返すこと |

### filterServicesByView — Editor / viewMode: SYNC

| # | テストケース |
|---|---|
| 27 | viewMode が SYNC のとき、operationPermissions に含まれるサービスのみが返ること |
| 28 | viewMode が SYNC のとき、operationPermissions に含まれないサービスが除外されること |
| 29 | viewMode が SYNC のとき、operationPermissions が空の場合空配列を返すこと |
| 30 | viewMode が SYNC のとき、複数サービスのうち一部だけ権限がある場合、権限のあるものだけが返ること |
| 31 | viewMode が SYNC のとき、フィルタ後も元のサービスリストの順序が保持されること |

### filterServicesByView — Editor / viewMode: CUSTOM

| # | テストケース |
|---|---|
| 32 | viewMode が CUSTOM のとき、viewPermissions に含まれるサービスのみが返ること |
| 33 | viewMode が CUSTOM のとき、viewPermissions に含まれないサービスが除外されること |
| 34 | viewMode が CUSTOM のとき、viewPermissions が空の場合空配列を返すこと |
| 35 | viewMode が CUSTOM のとき、複数サービスのうち一部だけ閲覧権限がある場合、閲覧権限のあるものだけが返ること |
| 36 | viewMode が CUSTOM のとき、フィルタ後も元のサービスリストの順序が保持されること |

### filterServicesByView — Viewer / viewMode: ALL

| # | テストケース |
|---|---|
| 37 | Viewer で viewMode が ALL のとき、サービスリストがそのまま返ること |

### filterServicesByView — Viewer / viewMode: CUSTOM

| # | テストケース |
|---|---|
| 38 | Viewer で viewMode が CUSTOM のとき、viewPermissions に含まれるサービスのみが返ること |
| 39 | Viewer で viewMode が CUSTOM のとき、viewPermissions が空の場合空配列を返すこと |

---

### addViewPermissions — 基本追加

| # | テストケース |
|---|---|
| 40 | 閲覧権限一覧が空の場合、追加したサービスが一覧に含まれること |
| 41 | 既存の一覧に新しいサービスを追加すると、そのサービスが一覧に追加されること |
| 42 | 複数のサービスを一度に追加できること |
| 43 | 追加後も既存のサービスがすべて残ること |
| 44 | 空のリストを追加しても一覧が変化しないこと |

### addViewPermissions — 重複排除

| # | テストケース |
|---|---|
| 45 | 既に一覧にあるサービスを再度追加しても一覧に1件しか含まれないこと |
| 46 | 追加リスト内に同一サービスが重複していても一覧に1件しか含まれないこと |

### addViewPermissions — 順序

| # | テストケース |
|---|---|
| 47 | 追加前の既存サービスの順序が維持されること |
| 48 | 新しいサービスは既存サービスの後に追加されること |

### removeViewPermissions — 基本削除

| # | テストケース |
|---|---|
| 49 | 指定したサービスが一覧から削除されること |
| 50 | 複数のサービスを一度に削除できること |
| 51 | 削除後も残るべきサービスはすべて変化しないこと |

### removeViewPermissions — 境界条件

| # | テストケース |
|---|---|
| 52 | 存在しないサービスを削除しようとしても一覧が変化しないこと |
| 53 | 空の一覧から削除しようとしても空のまま返ること |
| 54 | 空の削除リストを渡しても一覧が変化しないこと |
| 55 | 一覧にある全サービスを削除すると空配列が返ること |
