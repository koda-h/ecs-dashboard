import { describe, it, expect, beforeEach } from "vitest";
import {
  isValidRole,
  isAdmin,
  isEditor,
  isViewer,
  getDefaultRole,
  isSelf,
  canChangeRole,
  canDeleteUser,
} from "@/lib/users/role";

// ──────────────────────────────────────────────────────────────────
// ユーザロール仕様
//
// ロール種別: Admin / Editor / Viewer の3種類。
// ・Admin  : 全サービスの操作・閲覧が可能。ユーザ管理画面にアクセス可能。
// ・Editor : 権限付与されたサービスの操作・閲覧が可能。
// ・Viewer : サービスの閲覧のみ可能。
//
// ユーザ登録時のデフォルトロールは Viewer。
// Admin は自分自身のロール変更・削除を行えない（誤操作防止）。
// ──────────────────────────────────────────────────────────────────

describe("ロールの有効性チェック", () => {
  it("'Admin' は有効なロールとして判定されること", () => {
    expect(isValidRole("Admin")).toBe(true);
  });

  it("'Editor' は有効なロールとして判定されること", () => {
    expect(isValidRole("Editor")).toBe(true);
  });

  it("'Viewer' は有効なロールとして判定されること", () => {
    expect(isValidRole("Viewer")).toBe(true);
  });

  it("空文字は無効なロールとして判定されること", () => {
    expect(isValidRole("")).toBe(false);
  });

  it("小文字表記('admin', 'editor', 'viewer')は無効なロールとして判定されること", () => {
    // ロール名は大文字始まりの正確な表記のみ有効
    expect(isValidRole("admin")).toBe(false);
    expect(isValidRole("editor")).toBe(false);
    expect(isValidRole("viewer")).toBe(false);
  });

  it("存在しないロール名('SuperAdmin', 'Guest' など)は無効なロールとして判定されること", () => {
    expect(isValidRole("SuperAdmin")).toBe(false);
    expect(isValidRole("Guest")).toBe(false);
  });

  it("null は無効なロールとして判定されること", () => {
    expect(isValidRole(null)).toBe(false);
  });

  it("undefined は無効なロールとして判定されること", () => {
    expect(isValidRole(undefined)).toBe(false);
  });

  it("数値は無効なロールとして判定されること", () => {
    // 文字列以外の型はすべて無効
    expect(isValidRole(1)).toBe(false);
    expect(isValidRole(0)).toBe(false);
  });
});

describe("ロール種別の判定 — isAdmin", () => {
  it("'Admin' ロールは Admin と判定されること", () => {
    expect(isAdmin("Admin")).toBe(true);
  });

  it("'Editor' ロールは Admin ではないこと", () => {
    expect(isAdmin("Editor")).toBe(false);
  });

  it("'Viewer' ロールは Admin ではないこと", () => {
    expect(isAdmin("Viewer")).toBe(false);
  });
});

describe("ロール種別の判定 — isEditor", () => {
  it("'Editor' ロールは Editor と判定されること", () => {
    expect(isEditor("Editor")).toBe(true);
  });

  it("'Admin' ロールは Editor ではないこと", () => {
    expect(isEditor("Admin")).toBe(false);
  });

  it("'Viewer' ロールは Editor ではないこと", () => {
    expect(isEditor("Viewer")).toBe(false);
  });
});

describe("ロール種別の判定 — isViewer", () => {
  it("'Viewer' ロールは Viewer と判定されること", () => {
    expect(isViewer("Viewer")).toBe(true);
  });

  it("'Admin' ロールは Viewer ではないこと", () => {
    expect(isViewer("Admin")).toBe(false);
  });

  it("'Editor' ロールは Viewer ではないこと", () => {
    expect(isViewer("Editor")).toBe(false);
  });
});

describe("デフォルトロール", () => {
  // ユーザ登録時は Viewer 権限が付与される仕様
  it("getDefaultRole() は 'Viewer' を返すこと", () => {
    expect(getDefaultRole()).toBe("Viewer");
  });
});

// ──────────────────────────────────────────────────────────────────
// 自分自身の保護
//
// Admin が自分自身のロール変更・削除を行うと、管理者不在になるリスクがある。
// そのため、操作対象が自分自身である場合は変更・削除を禁止する。
// ──────────────────────────────────────────────────────────────────

describe("自分自身の判定 — isSelf", () => {
  let currentUserId: string;
  let otherUserId: string;

  beforeEach(() => {
    currentUserId = "user-id-aaa111";
    otherUserId = "user-id-bbb222";
  });

  it("同じ内部IDを渡した場合、自分自身と判定されること", () => {
    const result = isSelf(currentUserId, currentUserId);

    expect(result).toBe(true);
  });

  it("異なる内部IDを渡した場合、自分自身ではないと判定されること", () => {
    const result = isSelf(currentUserId, otherUserId);

    expect(result).toBe(false);
  });

  it("片方が空文字の場合、自分自身ではないと判定されること", () => {
    // 空文字は無効なユーザIDとして扱う
    const resultEmptyCurrent = isSelf("", otherUserId);
    const resultEmptyTarget = isSelf(currentUserId, "");

    expect(resultEmptyCurrent).toBe(false);
    expect(resultEmptyTarget).toBe(false);
  });
});

describe("ロール変更の可否 — canChangeRole", () => {
  let adminId: string;
  let otherUserId: string;

  beforeEach(() => {
    adminId = "admin-internal-id-001";
    otherUserId = "other-internal-id-002";
  });

  it("Admin が別のユーザのロールを変更しようとした場合、許可と判定されること", () => {
    const result = canChangeRole(adminId, otherUserId);

    expect(result).toBe(true);
  });

  it("Admin が自分自身のロールを変更しようとした場合、禁止と判定されること", () => {
    // 自分を Admin 以外に変えると管理者不在になる可能性があるため禁止
    const result = canChangeRole(adminId, adminId);

    expect(result).toBe(false);
  });
});

describe("ユーザ削除の可否 — canDeleteUser", () => {
  let adminId: string;
  let otherUserId: string;

  beforeEach(() => {
    adminId = "admin-internal-id-001";
    otherUserId = "other-internal-id-002";
  });

  it("Admin が別のユーザを削除しようとした場合、許可と判定されること", () => {
    const result = canDeleteUser(adminId, otherUserId);

    expect(result).toBe(true);
  });

  it("Admin が自分自身を削除しようとした場合、禁止と判定されること", () => {
    // 自分を削除すると管理者不在になる可能性があるため禁止
    const result = canDeleteUser(adminId, adminId);

    expect(result).toBe(false);
  });
});
