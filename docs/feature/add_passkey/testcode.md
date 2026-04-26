# テストコード実装まとめ — パスキー機能 (add_passkey)

## 実施内容

### 新規実装（プロダクションコード）

| ファイル | 概要 |
|---|---|
| `lib/auth/passkey/registration.ts` | パスキー登録オプション生成・検証・保存・削除・一覧取得 |
| `lib/auth/passkey/authentication.ts` | discoverable credentials 方式の認証オプション生成・ユーザ特定・counter 更新 |
| `lib/auth/passkey/challenge.ts` | チャレンジ保存・消費（WebAuthnChallenge） |
| `lib/auth/passkey/webauthn-user-id.ts` | WebAuthn ユーザID の生成・エンコード・デコード |
| `app/api/passkey/register/options/route.ts` | POST: 登録オプション生成（認証必須） |
| `app/api/passkey/register/verify/route.ts` | POST: 登録検証・パスキー保存（認証必須） |
| `app/api/passkey/authenticate/options/route.ts` | POST: 認証オプション生成（認証不要、loginId 不要） |
| `app/api/passkey/authenticate/verify/route.ts` | POST: 認証検証・セッション発行（認証不要） |
| `app/api/passkey/[id]/route.ts` | DELETE: パスキー削除（認証必須・所有権確認） |
| `app/account/passkeys/page.tsx` | パスキー管理画面（Server Component） |
| `app/account/passkeys/PasskeyClient.tsx` | パスキー管理 UI（Client Component） |
| `components/UserMenu.tsx` | 「パスキー管理」リンク追加 |
| `app/login/page.tsx` | 「パスキーでログイン」ボタン追加（discoverable credentials） |

### テストユーティリティ

| ファイル | 追加内容 |
|---|---|
| `src/test-utils/passkey.ts` | `createTestPasskey(userId, overrides?)` を新規作成 |

---

## テスト実装ファイル

### `__tests__/auth/passkey/challenge.test.ts` — 20ケース

**consumeChallenge（正常系）**（5ケース）
- 有効なチャレンジを渡すと取得・削除されること
- type, userId が一致すること
- 消費後 DB に残っていないこと

**consumeChallenge（異常系）**（4ケース）
- 存在しないチャレンジで NotFound エラー
- 期限切れチャレンジで Expired エラー
- type 不一致で TypeMismatch エラー

**consumeChallenge（userId 検証）**（5ケース）
- userId が null → null のみマッチ
- userId が指定値 → null はマッチしない
- 不一致 userId は拒否

**チャレンジの一意性**（3ケース）
- 同一チャレンジ文字列は重複登録不可
- 異なるチャレンジは両立可能

**saveChallenge（DB 保存確認）**（3ケース）
- 保存後に findUnique で取得できること
- expiresAt が正しく設定されること

---

### `__tests__/auth/passkey/webauthn-user-id.test.ts` — 11ケース

**generateWebAuthnUserId**（3ケース）
- 21バイトの base64url 文字列を返すこと
- 呼び出すたびに異なる値を返すこと

**encodeWebAuthnUserId / decodeWebAuthnUserId**（4ケース）
- エンコード → デコードで元の Uint8Array が復元できること
- Uint8Array ↔ base64url 変換の整合性

**バリデーション**（4ケース）
- 不正な base64url 文字列はデコードエラー
- 空文字列はエラー

---

### `__tests__/auth/passkey/repository.test.ts` — 17ケース

**storePasskey（正常系）**（4ケース）
- パスキーが DB に保存されること
- 保存されたレコードのフィールドが正しいこと

**storePasskey（上限チェック）**（3ケース）
- 5件登録済みで "Passkey limit reached" エラー
- 上限エラー時、既存パスキーが変更されないこと（不変条件）

**storePasskey（credentialId の一意性）**（2ケース）
- 重複 credentialId で一意性制約エラー
- エラー時、既存レコード不変

**listPasskeys**（4ケース）
- 該当ユーザのパスキー一覧が返されること
- 他ユーザのパスキーは含まれないこと

**deletePasskey**（4ケース）
- 削除後 DB に存在しないこと
- 他ユーザのパスキーは削除されないこと（所有権確認）
- 存在しないパスキーは "Passkey not found" エラー
- 所有権不一致は "Unauthorized" エラー

---

### `__tests__/auth/passkey/authentication.test.ts` — 13ケース（discoverable credentials 方式）

**generatePasskeyAuthenticationOptions（正常系）**（4ケース）
- 引数なしで PublicKeyCredentialRequestOptionsJSON が返されること
- challenge が DB に保存されること
- userId が null で保存されること
- allowCredentials が空または未指定であること（discoverable credentials）

**findUserByCredentialId（正常系）**（4ケース）
- credentialId からユーザ情報が返されること
- userId（表示用ID）が含まれること
- role が含まれること
- User.id（内部ID）が含まれないこと

**findUserByCredentialId（異常系）**（1ケース）
- 存在しない credentialId でエラー

**updatePasskeyAfterAuth（正常系）**（3ケース）
- counter が更新されること
- lastUsedAt が更新されること
- 他パスキーは変更されないこと

**updatePasskeyAfterAuth（異常系）**（1ケース）
- 存在しない credentialId でエラー

---

## E2E テスト実装ファイル

### `e2e/passkey/management.spec.ts` — 10ケース

**未認証リダイレクト**（1ケース）
- `/account/passkeys` → `/login` にリダイレクト

**パスキー管理ページ - 表示**（7ケース）
- 見出し・カウンター表示
- ダッシュボードへ戻るリンク
- 「パスキーを追加」ボタン
- ボタン押下でフォーム表示
- キャンセルでフォーム非表示
- パスキー名空でボタン無効
- パスキー名入力でボタン有効化

**UserMenu - パスキー管理リンク**（2ケース）
- リンク表示確認
- リンク遷移確認

---

### `e2e/passkey/registration.spec.ts` — 4ケース

仮想認証器（Chrome CDP WebAuthn API）を使用。serial 実行。

**パスキー登録フロー**（2ケース）
- 登録後に一覧に追加される（登録後クリーンアップ）
- 登録後カウンターが増加する（登録後クリーンアップ）

**パスキー削除フロー**（2ケース）
- 削除確認ダイアログ承認でパスキー削除
- 削除確認ダイアログキャンセルでパスキー残存

---

### `e2e/passkey/authentication.spec.ts` — 2ケース

discoverable credentials 方式（loginId 不要）。serial 実行。

**パスキー認証フロー**（1ケース）
- 登録 → cookie 削除 → loginId なしで「パスキーでログイン」→ ダッシュボードへ遷移

**パスキーログイン - UI**（1ケース）
- ログインページに「パスキーでログイン」ボタン表示

---

## テスト実行結果

```
__tests__/auth/passkey/challenge.test.ts        20 tests ✓
__tests__/auth/passkey/repository.test.ts       17 tests ✓
__tests__/auth/passkey/webauthn-user-id.test.ts 11 tests ✓
__tests__/auth/passkey/authentication.test.ts   13 tests ✓
```

TypeScript: `npx tsc --noEmit` エラーなし
