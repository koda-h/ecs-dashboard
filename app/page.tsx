import { ServiceTable } from "@/components/ServiceTable";
import { UserMenu } from "@/components/UserMenu";
import { getSessionFromCookie } from "@/lib/auth/cookies";
import { prisma } from "@/lib/db";
import type { ViewMode } from "@/lib/users/permission";

export default async function Home() {
  const session = await getSessionFromCookie();

  let servicePermissions: { serviceArn: string }[] = [];
  let viewMode: ViewMode = "ALL";
  let viewPermissions: { serviceArn: string }[] = [];

  if ((session?.role === "Editor" || session?.role === "Viewer") && session.userId) {
    const user = await prisma.user.findUnique({
      where: { userId: session.userId },
      select: {
        viewMode: true,
        servicePermissions: { select: { serviceArn: true } },
        viewPermissions: { select: { serviceArn: true } },
      },
    });
    viewMode = (user?.viewMode as ViewMode) ?? "ALL";
    viewPermissions = user?.viewPermissions ?? [];
    if (session.role === "Editor") {
      servicePermissions = user?.servicePermissions ?? [];
    }
  }

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">ECS Dashboard</h1>
        {session && (
          <UserMenu userId={session.userId} role={session.role ?? null} />
        )}
      </div>
      <ServiceTable
        role={session?.role ?? null}
        servicePermissions={servicePermissions}
        viewMode={viewMode}
        viewPermissions={viewPermissions}
      />
    </main>
  );
}
