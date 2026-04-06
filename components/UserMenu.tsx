"use client";

import { useState, useRef, useEffect } from "react";
import { User, LogOut, Users, Menu } from "lucide-react";
import { logoutAction } from "@/app/actions/logout";
import type { UserRole } from "@/lib/users/role";

interface UserMenuProps {
  userId: string;
  role: UserRole | null;
}

export function UserMenu({ userId, role }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600">
        ログイン中: <span className="font-medium">{userId}</span>
      </span>

      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex items-center justify-center w-9 h-9 rounded-md border border-gray-300 bg-white hover:bg-gray-50 transition-colors"
          aria-label="メニュー"
        >
          <Menu className="w-4 h-4 text-gray-600" />
        </button>

        {open && (
          <div className="absolute right-0 mt-1 w-44 rounded-md border border-gray-200 bg-white shadow-lg z-50">
            <div className="py-1">
              <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-2 text-xs text-gray-500">
                <User className="w-3 h-3" />
                {role ?? "—"}
              </div>

              {role === "Admin" && (
                <a
                  href="/users"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  onClick={() => setOpen(false)}
                >
                  <Users className="w-4 h-4" />
                  ユーザ一覧
                </a>
              )}

              <form action={logoutAction}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  onClick={() => setOpen(false)}
                >
                  <LogOut className="w-4 h-4" />
                  ログアウト
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
