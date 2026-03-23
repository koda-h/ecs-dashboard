import { NextRequest, NextResponse } from "next/server";
import { updateServiceDesiredCount } from "@/lib/ecs";

export async function POST(request: NextRequest) {
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
