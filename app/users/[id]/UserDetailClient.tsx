"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { UserDetail } from "@/lib/users/queries";
import type { UserRole } from "@/lib/users/role";

interface Props {
  user: UserDetail;
  isSelf: boolean;
}

const ROLES: UserRole[] = ["Admin", "Editor", "Viewer"];

export function UserDetailClient({ user, isSelf }: Props) {
  const router = useRouter();

  const [userId, setUserId] = useState(user.userId);
  const [role, setRole] = useState<UserRole>(user.role);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // permission add state
  const [clusterFilter, setClusterFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);
  const [services, setServices] = useState<UserDetail["servicePermissions"]>(
    user.servicePermissions
  );

  // permission remove state
  const [selectedArns, setSelectedArns] = useState<Set<string>>(new Set());
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);

  // delete dialog state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // add permission dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [availableServices, setAvailableServices] = useState<
    Array<{
      clusterArn: string;
      clusterName: string;
      serviceArn: string;
      serviceName: string;
    }>
  >([]);
  const [fetchingServices, setFetchingServices] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedToAdd, setSelectedToAdd] = useState<Set<string>>(new Set());

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      if (!res.ok) {
        const data = await res.json();
        setSaveError(data.error ?? "保存に失敗しました");
        return;
      }
      router.refresh();
    } catch {
      setSaveError("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setDeleteError(data.error ?? "削除に失敗しました");
        return;
      }
      router.push("/users");
    } catch {
      setDeleteError("削除に失敗しました");
    } finally {
      setDeleteLoading(false);
    }
  }

  async function openAddDialog() {
    setShowAddDialog(true);
    setSelectedToAdd(new Set());
    setFetchError(null);
    setFetchingServices(true);
    try {
      const params = new URLSearchParams();
      if (clusterFilter) params.set("cluster", clusterFilter);
      if (serviceFilter) params.set("service", serviceFilter);
      const res = await fetch(`/api/services?${params.toString()}`);
      if (!res.ok) throw new Error("取得失敗");
      const data = await res.json();
      setAvailableServices(data.services ?? []);
    } catch {
      setFetchError("サービス一覧の取得に失敗しました");
    } finally {
      setFetchingServices(false);
    }
  }

  async function handleAddPermissions() {
    if (selectedToAdd.size === 0) return;
    setAddLoading(true);
    setAddError(null);
    try {
      const permissions = availableServices.filter((s) =>
        selectedToAdd.has(s.serviceArn)
      );
      const res = await fetch(`/api/users/${user.id}/permissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions }),
      });
      if (!res.ok) {
        const data = await res.json();
        setAddError(data.error ?? "追加に失敗しました");
        return;
      }
      // merge locally
      const added = permissions.filter(
        (p) => !services.some((s) => s.serviceArn === p.serviceArn)
      );
      setServices((prev) => [
        ...prev,
        ...added.map((p) => ({ ...p, id: p.serviceArn })),
      ]);
      setShowAddDialog(false);
    } catch {
      setAddError("追加に失敗しました");
    } finally {
      setAddLoading(false);
    }
  }

  async function handleRemovePermissions() {
    if (selectedArns.size === 0) return;
    setRemoveLoading(true);
    setRemoveError(null);
    try {
      const res = await fetch(`/api/users/${user.id}/permissions`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceArns: Array.from(selectedArns) }),
      });
      if (!res.ok) {
        const data = await res.json();
        setRemoveError(data.error ?? "削除に失敗しました");
        return;
      }
      setServices((prev) =>
        prev.filter((s) => !selectedArns.has(s.serviceArn))
      );
      setSelectedArns(new Set());
    } catch {
      setRemoveError("削除に失敗しました");
    } finally {
      setRemoveLoading(false);
    }
  }

  function toggleSelectArn(arn: string) {
    setSelectedArns((prev) => {
      const next = new Set(prev);
      if (next.has(arn)) next.delete(arn);
      else next.add(arn);
      return next;
    });
  }

  function toggleSelectToAdd(arn: string) {
    setSelectedToAdd((prev) => {
      const next = new Set(prev);
      if (next.has(arn)) next.delete(arn);
      else next.add(arn);
      return next;
    });
  }

  const filteredAvailable = availableServices.filter((s) => {
    const alreadyGranted = services.some((p) => p.serviceArn === s.serviceArn);
    const matchCluster = clusterFilter
      ? s.clusterName.includes(clusterFilter)
      : true;
    const matchService = serviceFilter
      ? s.serviceName.includes(serviceFilter)
      : true;
    return !alreadyGranted && matchCluster && matchService;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">ユーザ詳細</h1>
        <Link
          href="/users"
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          ← ユーザ一覧へ
        </Link>
      </div>

      {/* Basic info form */}
      <section className="border border-gray-200 rounded-md p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">基本情報</h2>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">ユーザID</label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            disabled={isSelf}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-400"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">
            メールアドレス
          </label>
          <input
            type="text"
            value={user.email}
            readOnly
            className="block w-full rounded-md border border-gray-200 px-3 py-2 text-sm bg-gray-50 text-gray-500"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            ユーザ種別
          </label>
          <div className="flex gap-4">
            {ROLES.map((r) => (
              <label key={r} className="flex items-center gap-1.5 text-sm">
                <input
                  type="radio"
                  name="role"
                  value={r}
                  checked={role === r}
                  onChange={() => setRole(r)}
                  disabled={isSelf}
                />
                {r}
              </label>
            ))}
          </div>
        </div>

        {saveError && (
          <p className="text-sm text-red-600">{saveError}</p>
        )}

        {!isSelf && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "保存中…" : "保存"}
          </button>
        )}
      </section>

      {/* Service permissions (Editor only) */}
      {role === "Editor" && (
        <section className="border border-gray-200 rounded-md p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">操作権限</h2>

          {/* Filter inputs */}
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="クラスタ名でフィルタ"
              value={clusterFilter}
              onChange={(e) => setClusterFilter(e.target.value)}
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="サービス名でフィルタ"
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={openAddDialog}
              className="px-4 py-2 rounded-md bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors"
            >
              追加
            </button>
          </div>

          {/* Permission list */}
          {services.length === 0 ? (
            <p className="text-sm text-gray-400">権限が付与されていません</p>
          ) : (
            <div className="rounded-md border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="w-8 px-3 py-2" />
                    <th className="text-left px-3 py-2 font-medium text-gray-600">
                      クラスタ
                    </th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">
                      サービス
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {services.map((p) => (
                    <tr key={p.serviceArn} className="hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedArns.has(p.serviceArn)}
                          onChange={() => toggleSelectArn(p.serviceArn)}
                        />
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        {p.clusterName}
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        {p.serviceName}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {removeError && (
            <p className="text-sm text-red-600">{removeError}</p>
          )}

          {selectedArns.size > 0 && (
            <button
              type="button"
              onClick={handleRemovePermissions}
              disabled={removeLoading}
              className="px-4 py-2 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {removeLoading
                ? "削除中…"
                : `選択した ${selectedArns.size} 件を削除`}
            </button>
          )}
        </section>
      )}

      {/* Delete user */}
      {!isSelf && (
        <section className="border border-red-200 rounded-md p-6 space-y-3">
          <h2 className="text-lg font-semibold text-red-700">ユーザ削除</h2>
          <p className="text-sm text-gray-600">
            このユーザを削除すると元に戻せません。
          </p>
          {deleteError && (
            <p className="text-sm text-red-600">{deleteError}</p>
          )}
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
          >
            削除
          </button>
        </section>
      )}

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl p-6 w-80 space-y-4">
            <h3 className="text-base font-semibold text-gray-900">
              ユーザを削除しますか？
            </h3>
            <p className="text-sm text-gray-600">
              <span className="font-medium">{user.userId}</span>{" "}
              を削除します。この操作は取り消せません。
            </p>
            {deleteError && (
              <p className="text-sm text-red-600">{deleteError}</p>
            )}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleteLoading ? "削除中…" : "削除する"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add permission dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl p-6 w-[480px] space-y-4 max-h-[80vh] flex flex-col">
            <h3 className="text-base font-semibold text-gray-900">
              操作権限を追加
            </h3>

            {fetchingServices ? (
              <p className="text-sm text-gray-500 py-4 text-center">
                取得中…
              </p>
            ) : fetchError ? (
              <p className="text-sm text-red-600">{fetchError}</p>
            ) : filteredAvailable.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">
                追加可能なサービスがありません
              </p>
            ) : (
              <div className="overflow-y-auto flex-1 rounded-md border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                    <tr>
                      <th className="w-8 px-3 py-2" />
                      <th className="text-left px-3 py-2 font-medium text-gray-600">
                        クラスタ
                      </th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">
                        サービス
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredAvailable.map((s) => (
                      <tr key={s.serviceArn} className="hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={selectedToAdd.has(s.serviceArn)}
                            onChange={() => toggleSelectToAdd(s.serviceArn)}
                          />
                        </td>
                        <td className="px-3 py-2 text-gray-700">
                          {s.clusterName}
                        </td>
                        <td className="px-3 py-2 text-gray-700">
                          {s.serviceName}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {addError && <p className="text-sm text-red-600">{addError}</p>}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAddDialog(false)}
                disabled={addLoading}
                className="px-4 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleAddPermissions}
                disabled={addLoading || selectedToAdd.size === 0}
                className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {addLoading
                  ? "追加中…"
                  : `${selectedToAdd.size} 件を追加`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
