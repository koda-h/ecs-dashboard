import { ServiceTable } from "@/components/ServiceTable";
import { UserMenu } from "@/components/UserMenu";
import { getSessionFromCookie } from "@/lib/auth/cookies";

export default async function Home() {
  const session = await getSessionFromCookie();

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">ECS Dashboard</h1>
        {session && (
          <UserMenu userId={session.userId} role={session.role ?? null} />
        )}
      </div>
      <ServiceTable />
    </main>
  );
}
