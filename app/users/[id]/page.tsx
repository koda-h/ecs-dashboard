import { notFound } from "next/navigation";
import { getUserById } from "@/lib/users/queries";
import { getSessionFromCookie } from "@/lib/auth/cookies";
import { UserDetailClient } from "./UserDetailClient";

type Props = { params: Promise<{ id: string }> };

export default async function UserDetailPage({ params }: Props) {
  const { id } = await params;
  const [user, session] = await Promise.all([
    getUserById(id),
    getSessionFromCookie(),
  ]);

  if (!user) notFound();

  const isSelf = session?.userId === user.userId;

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 w-full">
      <UserDetailClient user={user} isSelf={isSelf} />
    </main>
  );
}
