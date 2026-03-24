import { ServiceTable } from "@/components/ServiceTable";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { getSessionFromCookie } from "@/lib/auth/cookies";

export default async function Home() {
  const session = await getSessionFromCookie();

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">ECS Dashboard</h1>
        <div className="flex items-center gap-3">
          {session && (
            <span className="text-sm text-gray-600">
              ログイン中:{" "}
              <span className="font-medium">{session.userId}</span>
            </span>
          )}
          <LogoutButton />
        </div>
      </div>
      <ServiceTable />
    </main>
  );
}
