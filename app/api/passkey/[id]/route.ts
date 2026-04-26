import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/cookies";
import { prisma } from "@/lib/db";
import { deletePasskey } from "@/lib/auth/passkey/repository";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { id } = await params;

  try {
    await deletePasskey(id, user.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Passkey not found") {
        return NextResponse.json(
          { error: "パスキーが見つかりません" },
          { status: 404 }
        );
      }
      if (err.message === "Unauthorized") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    return NextResponse.json({ error: "パスキーの削除に失敗しました" }, { status: 500 });
  }
}
