import {
  ECSClient,
  ListClustersCommand,
  ListServicesCommand,
  DescribeServicesCommand,
  UpdateServiceCommand,
} from "@aws-sdk/client-ecs";

const client = new ECSClient({
  region: process.env.AWS_REGION ?? "ap-northeast-1",
});

const SSO_EXPIRED_PATTERNS = [
  "SSO session associated with this profile is invalid",
  "SSO session associated with this profile has expired",
  "Could not load credentials from any providers",
];

export function isSsoSessionError(err: unknown): boolean {
  return (
    err instanceof Error &&
    SSO_EXPIRED_PATTERNS.some((p) => err.message.includes(p))
  );
}

export interface ServiceInfo {
  clusterArn: string;
  clusterName: string;
  serviceArn: string;
  serviceName: string;
  desiredCount: number;
  runningCount: number;
  pendingCount: number;
  status: string;
}

export async function listClusters(): Promise<string[]> {
  const clusterArns: string[] = [];
  let nextToken: string | undefined;

  do {
    const res = await client.send(new ListClustersCommand({ nextToken }));
    clusterArns.push(...(res.clusterArns ?? []));
    nextToken = res.nextToken;
  } while (nextToken);

  return clusterArns;
}

function clusterNameFromArn(arn: string): string {
  return arn.split("/").pop() ?? arn;
}

export async function listServicesForCluster(
  clusterArn: string
): Promise<ServiceInfo[]> {
  const serviceArns: string[] = [];
  let nextToken: string | undefined;

  do {
    const res = await client.send(
      new ListServicesCommand({ cluster: clusterArn, nextToken })
    );
    serviceArns.push(...(res.serviceArns ?? []));
    nextToken = res.nextToken;
  } while (nextToken);

  if (serviceArns.length === 0) return [];

  // DescribeServices は 10 件ずつしか取れない
  const services: ServiceInfo[] = [];
  for (let i = 0; i < serviceArns.length; i += 10) {
    const chunk = serviceArns.slice(i, i + 10);
    const res = await client.send(
      new DescribeServicesCommand({ cluster: clusterArn, services: chunk })
    );
    for (const svc of res.services ?? []) {
      services.push({
        clusterArn,
        clusterName: clusterNameFromArn(clusterArn),
        serviceArn: svc.serviceArn ?? "",
        serviceName: svc.serviceName ?? "",
        desiredCount: svc.desiredCount ?? 0,
        runningCount: svc.runningCount ?? 0,
        pendingCount: svc.pendingCount ?? 0,
        status: svc.status ?? "",
      });
    }
  }

  return services;
}

export async function updateServiceDesiredCount(
  clusterArn: string,
  serviceArn: string,
  desiredCount: number
): Promise<void> {
  await client.send(
    new UpdateServiceCommand({
      cluster: clusterArn,
      service: serviceArn,
      desiredCount,
    })
  );
}
