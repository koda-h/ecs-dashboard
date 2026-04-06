export type UserRole = "Admin" | "Editor" | "Viewer";

const VALID_ROLES = ["Admin", "Editor", "Viewer"] as const;

export function isValidRole(role: unknown): role is UserRole {
  return typeof role === "string" && (VALID_ROLES as readonly string[]).includes(role);
}

export function isAdmin(role: UserRole): boolean {
  return role === "Admin";
}

export function isEditor(role: UserRole): boolean {
  return role === "Editor";
}

export function isViewer(role: UserRole): boolean {
  return role === "Viewer";
}

export function getDefaultRole(): UserRole {
  return "Viewer";
}

/**
 * 2 つの内部ID（User.id）が同一ユーザを指すかを返す。
 * 空文字は無効なIDとして扱い、常に false を返す。
 */
export function isSelf(currentId: string, targetId: string): boolean {
  if (!currentId || !targetId) return false;
  return currentId === targetId;
}

/** Admin が対象ユーザのロールを変更してよいかを返す（自分自身は変更不可） */
export function canChangeRole(currentUserId: string, targetUserId: string): boolean {
  return !isSelf(currentUserId, targetUserId);
}

/** Admin が対象ユーザを削除してよいかを返す（自分自身は削除不可） */
export function canDeleteUser(currentUserId: string, targetUserId: string): boolean {
  return !isSelf(currentUserId, targetUserId);
}
