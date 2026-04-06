import { prisma } from "@/lib/db";

export type UserDetail = {
  id: string;
  userId: string;
  email: string;
  role: "Admin" | "Editor" | "Viewer";
  servicePermissions: Array<{
    id: string;
    clusterArn: string;
    clusterName: string;
    serviceArn: string;
    serviceName: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
};

const userSelect = {
  id: true,
  userId: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true,
  servicePermissions: {
    select: {
      id: true,
      clusterArn: true,
      clusterName: true,
      serviceArn: true,
      serviceName: true,
    },
  },
} as const;

/** 全ユーザを登録日時の降順で返す */
export async function listUsers(): Promise<UserDetail[]> {
  return prisma.user.findMany({
    select: userSelect,
    orderBy: { createdAt: "desc" },
  }) as Promise<UserDetail[]>;
}

/** 内部 ID でユーザを取得する。存在しない場合は null を返す */
export async function getUserById(id: string): Promise<UserDetail | null> {
  const user = await prisma.user.findUnique({
    where: { id },
    select: userSelect,
  });
  return user as UserDetail | null;
}
