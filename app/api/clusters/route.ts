import { NextResponse } from "next/server";
import { listClusters } from "@/lib/ecs";

export async function GET() {
  try {
    const clusterArns = await listClusters();
    const clusters = clusterArns.map((arn) => ({
      arn,
      name: arn.split("/").pop() ?? arn,
    }));
    return NextResponse.json({ clusters });
  } catch (err) {
    console.error("Failed to list clusters:", err);
    return NextResponse.json(
      { error: "クラスター一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}
