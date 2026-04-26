"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { startRegistration } from "@simplewebauthn/browser";
import type { PublicKeyCredentialCreationOptionsJSON } from "@simplewebauthn/browser";
import { toast } from "sonner";
import { KeyRound, Trash2, Plus, Shield, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MAX_PASSKEYS_PER_USER } from "@/lib/auth/passkey/repository";

type PasskeyItem = {
  id: string;
  name: string;
  credentialId: string;
  deviceType: string;
  backedUp: boolean;
  transports: string[];
  createdAt: string;
  lastUsedAt: string | null;
};

interface Props {
  initialPasskeys: PasskeyItem[];
}

export function PasskeyClient({ initialPasskeys }: Props) {
  const router = useRouter();
  const [passkeys, setPasskeys] = useState<PasskeyItem[]>(initialPasskeys);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [registering, setRegistering] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setPasskeys(initialPasskeys);
  }, [initialPasskeys]);

  async function handleRegister() {
    if (!name.trim()) {
      toast.error("パスキー名を入力してください");
      return;
    }

    setRegistering(true);
    try {
      const optionsRes = await fetch("/api/passkey/register/options", {
        method: "POST",
      });
      if (!optionsRes.ok) {
        const data = (await optionsRes.json()) as { error?: string };
        toast.error(data.error ?? "登録オプションの取得に失敗しました");
        return;
      }
      const options =
        (await optionsRes.json()) as PublicKeyCredentialCreationOptionsJSON;

      let credential;
      try {
        credential = await startRegistration({ optionsJSON: options });
      } catch (err) {
        if (err instanceof Error && err.name === "NotAllowedError") {
          toast.error("パスキーの登録がキャンセルされました");
        } else {
          toast.error("パスキーの登録に失敗しました");
        }
        return;
      }

      const verifyRes = await fetch("/api/passkey/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential, name: name.trim() }),
      });
      const verifyData = (await verifyRes.json()) as { error?: string };
      if (!verifyRes.ok) {
        toast.error(verifyData.error ?? "パスキーの登録に失敗しました");
        return;
      }

      toast.success("パスキーを登録しました");
      setShowForm(false);
      setName("");
      router.refresh();
    } finally {
      setRegistering(false);
    }
  }

  async function handleDelete(passkeyId: string, passkeyName: string) {
    if (!window.confirm(`「${passkeyName}」を削除しますか？`)) return;

    setDeletingId(passkeyId);
    try {
      const res = await fetch(`/api/passkey/${passkeyId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? "パスキーの削除に失敗しました");
        return;
      }
      setPasskeys((prev) => prev.filter((p) => p.id !== passkeyId));
      toast.success("パスキーを削除しました");
    } finally {
      setDeletingId(null);
    }
  }

  const canRegister = passkeys.length < MAX_PASSKEYS_PER_USER;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            登録済みパスキー
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({passkeys.length} / {MAX_PASSKEYS_PER_USER})
            </span>
          </h2>
          {canRegister && !showForm && (
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4" />
              パスキーを追加
            </Button>
          )}
        </div>

        {showForm && (
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-600 mb-3">
              登録するパスキーの名前を入力してください（例: MacBook Touch ID）
            </p>
            <div className="flex items-center gap-3">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="パスキー名"
                maxLength={100}
                className="max-w-xs"
                disabled={registering}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRegister();
                  if (e.key === "Escape") {
                    setShowForm(false);
                    setName("");
                  }
                }}
                autoFocus
              />
              <Button
                onClick={handleRegister}
                disabled={registering || !name.trim()}
              >
                {registering ? "登録中..." : "登録"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setName("");
                }}
                disabled={registering}
              >
                キャンセル
              </Button>
            </div>
          </div>
        )}

        {passkeys.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <KeyRound className="mx-auto w-10 h-10 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">
              パスキーはまだ登録されていません
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {passkeys.map((passkey) => (
              <li
                key={passkey.id}
                data-passkey-id={passkey.id}
                className="px-6 py-4 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <KeyRound className="w-5 h-5 text-gray-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {passkey.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      登録日:{" "}
                      {new Date(passkey.createdAt).toLocaleDateString("ja-JP")}
                      {passkey.lastUsedAt && (
                        <>
                          {" "}
                          &nbsp;·&nbsp; 最終使用:{" "}
                          {new Date(passkey.lastUsedAt).toLocaleDateString(
                            "ja-JP"
                          )}
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {passkey.backedUp ? (
                    <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                      <ShieldCheck className="w-3 h-3" />
                      バックアップ済
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-full px-2 py-0.5">
                      <Shield className="w-3 h-3" />
                      このデバイスのみ
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-gray-400 hover:text-red-600"
                    onClick={() => handleDelete(passkey.id, passkey.name)}
                    disabled={deletingId === passkey.id}
                    aria-label={`${passkey.name}を削除`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-gray-400">
        パスキーはデバイスの生体認証（Touch ID、Face ID
        など）を使ってパスワードなしでログインできる機能です。
      </p>
    </div>
  );
}
