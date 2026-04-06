import Link from "next/link";
import { listUsers } from "@/lib/users/queries";
import { ServicePermissionCell } from "./ServicePermissionCell";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const users = await listUsers();

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">ユーザ一覧</h1>
        <Link
          href="/"
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          ← ダッシュボードへ
        </Link>
      </div>

      <div className="rounded-md border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                ユーザID
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                ユーザ種別
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                操作権限
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                登録日時
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                更新日時
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <Link
                    href={`/users/${user.id}`}
                    className="font-medium text-blue-600 hover:text-blue-800"
                  >
                    {user.userId}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-700">{user.role}</td>
                <td className="px-4 py-3 text-gray-500">
                  {user.role === "Editor" ? (
                    <ServicePermissionCell
                      permissions={user.servicePermissions}
                    />
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {user.createdAt.toLocaleString("ja-JP")}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {user.updatedAt.toLocaleString("ja-JP")}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  ユーザが登録されていません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
