import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/cookies";
import {
  addUserViewPermissions,
  removeUserViewPermissions,
} from "@/lib/users/mutations";

type Params = { params: Promise<{ id: string }> };

/** 閲覧権限を追加する */
export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSessionFromCookie();
  if (!session || session.role !== "Admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { permissions } = body as {
    permissions: Array<{
      clusterArn: string;
      clusterName: string;
      serviceArn: string;
      serviceName: string;
    }>;
  };

  if (!Array.isArray(permissions) || permissions.length === 0) {
    return NextResponse.json(
      { error: "permissions は1件以上の配列で指定してください" },
      { status: 400 }
    );
  }

  try {
    await addUserViewPermissions(id, permissions);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "閲覧権限の追加に失敗しました" },
      { status: 500 }
    );
  }
}

/** 閲覧権限を削除する */
export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSessionFromCookie();
  if (!session || session.role !== "Admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { serviceArns } = body as { serviceArns: string[] };

  if (!Array.isArray(serviceArns) || serviceArns.length === 0) {
    return NextResponse.json(
      { error: "serviceArns は1件以上の配列で指定してください" },
      { status: 400 }
    );
  }

  try {
    await removeUserViewPermissions(id, serviceArns);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "閲覧権限の削除に失敗しました" },
      { status: 500 }
    );
  }
}
