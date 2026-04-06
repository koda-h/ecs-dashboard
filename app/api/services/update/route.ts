import { NextRequest, NextResponse } from "next/server";
import { updateServiceDesiredCount } from "@/lib/ecs";
import { getSessionFromCookie } from "@/lib/auth/cookies";
import { canOperateService } from "@/lib/users/permission";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { role, userId } = session;

  try {
    const body = await request.json();
    const { clusterArn, serviceArn, desiredCount } = body;

    if (!clusterArn || !serviceArn || typeof desiredCount !== "number") {
      return NextResponse.json(
        { error: "clusterArn, serviceArn, desiredCount は必須です" },
        { status: 400 }
      );
    }

    if (desiredCount < 0) {
      return NextResponse.json(
        { error: "desiredCount は 0 以上の整数を指定してください" },
        { status: 400 }
      );
    }

    // Editor は付与済みサービスのみ操作可、Viewer は常に不可
    if (role !== "Admin") {
      const user = await prisma.user.findUnique({
        where: { userId },
        select: {
          servicePermissions: {
            select: {
              clusterArn: true,
              clusterName: true,
              serviceArn: true,
              serviceName: true,
            },
          },
        },
      });
      const permissions = user?.servicePermissions ?? [];
      if (!canOperateService(role ?? "Viewer", permissions, serviceArn)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    await updateServiceDesiredCount(clusterArn, serviceArn, desiredCount);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to update service:", err);
    return NextResponse.json(
      { error: "サービスの更新に失敗しました" },
      { status: 500 }
    );
  }
}
