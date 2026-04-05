import { NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/cookies";
import { listUsers } from "@/lib/users/queries";

export async function GET() {
  const session = await getSessionFromCookie();
  if (!session || session.role !== "Admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const users = await listUsers();
    return NextResponse.json({ users });
  } catch {
    return NextResponse.json(
      { error: "ユーザ一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}
