import { redirect } from "next/navigation";
import { getSessionFromCookie } from "@/lib/auth/cookies";
import { prisma } from "@/lib/db";
import { listPasskeys } from "@/lib/auth/passkey/repository";
import { UserMenu } from "@/components/UserMenu";
import { PasskeyClient } from "./PasskeyClient";

export const dynamic = "force-dynamic";

export default async function PasskeysPage() {
  const session = await getSessionFromCookie();
  if (!session) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  });
  if (!user) {
    redirect("/login");
  }

  const passkeys = (await listPasskeys(user.id)).map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    lastUsedAt: p.lastUsedAt?.toISOString() ?? null,
  }));

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 w-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <a href="/" className="text-sm text-blue-600 hover:underline">
            ← ダッシュボードに戻る
          </a>
          <h1 className="text-2xl font-bold text-gray-900">パスキー管理</h1>
        </div>
        <UserMenu userId={session.userId} role={session.role ?? null} />
      </div>
      <PasskeyClient initialPasskeys={passkeys} />
    </main>
  );
}
