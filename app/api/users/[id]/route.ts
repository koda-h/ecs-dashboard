import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/cookies";
import { getUserById } from "@/lib/users/queries";
import { updateUser, deleteUser } from "@/lib/users/mutations";
import { canChangeRole, canDeleteUser } from "@/lib/users/role";
import { isValidRole } from "@/lib/users/role";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSessionFromCookie();
  if (!session || session.role !== "Admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const user = await getUserById(id);
  if (!user) {
    return NextResponse.json({ error: "ユーザが見つかりません" }, { status: 404 });
  }
  return NextResponse.json({ user });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getSessionFromCookie();
  if (!session || session.role !== "Admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const body = await req.json();
  const { userId, role, viewMode } = body as { userId?: string; role?: string; viewMode?: string };

  if (role !== undefined && !isValidRole(role)) {
    return NextResponse.json({ error: "無効なロールです" }, { status: 400 });
  }

  const VALID_VIEW_MODES = ["ALL", "SYNC", "CUSTOM"] as const;
  if (viewMode !== undefined && !VALID_VIEW_MODES.includes(viewMode as typeof VALID_VIEW_MODES[number])) {
    return NextResponse.json({ error: "無効な viewMode です" }, { status: 400 });
  }

  // 自分自身のロール変更を禁止（currentUserId は session の内部IDではなく userId なので別途取得が必要）
  // ここでは簡易的に id で比較（session.userId は表示用IDのため getUserById で内部IDを取得）
  const currentUser = await getUserById(id); // target user
  if (!currentUser) {
    return NextResponse.json({ error: "ユーザが見つかりません" }, { status: 404 });
  }

  // セッションの userId(表示用) から自分の内部 ID を特定するために listUsers を使う
  // ※ 実装簡略化のため session.userId と currentUser.userId を比較
  if (role !== undefined && session.userId === currentUser.userId) {
    if (!canChangeRole(session.userId, currentUser.userId)) {
      return NextResponse.json(
        { error: "自分自身のロールは変更できません" },
        { status: 403 }
      );
    }
  }

  try {
    const updated = await updateUser(id, {
      ...(userId !== undefined ? { userId } : {}),
      ...(isValidRole(role) ? { role } : {}),
      ...(viewMode !== undefined ? { viewMode: viewMode as "ALL" | "SYNC" | "CUSTOM" } : {}),
    });
    return NextResponse.json({ user: updated });
  } catch {
    return NextResponse.json(
      { error: "ユーザの更新に失敗しました" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSessionFromCookie();
  if (!session || session.role !== "Admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const target = await getUserById(id);
  if (!target) {
    return NextResponse.json({ error: "ユーザが見つかりません" }, { status: 404 });
  }

  // 自分自身の削除を禁止
  if (!canDeleteUser(session.userId, target.userId)) {
    return NextResponse.json(
      { error: "自分自身は削除できません" },
      { status: 403 }
    );
  }

  try {
    await deleteUser(id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "ユーザの削除に失敗しました" },
      { status: 500 }
    );
  }
}
