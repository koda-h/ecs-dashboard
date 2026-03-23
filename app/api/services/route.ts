import { NextRequest, NextResponse } from "next/server";
import { listClusters, listServicesForCluster } from "@/lib/ecs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const clusterArn = searchParams.get("cluster");

  try {
    let clusterArns: string[];

    if (clusterArn) {
      clusterArns = [clusterArn];
    } else {
      clusterArns = await listClusters();
    }

    const results = await Promise.all(
      clusterArns.map((arn) => listServicesForCluster(arn))
    );
    const services = results.flat();

    return NextResponse.json({ services });
  } catch (err) {
    console.error("Failed to list services:", err);
    return NextResponse.json(
      { error: "サービス一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}
