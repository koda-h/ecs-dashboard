"use client";

import { useState } from "react";

interface Permission {
  serviceName: string;
}

interface Props {
  permissions: Permission[];
}

const MAX_CHARS = 60;

export function ServicePermissionCell({ permissions }: Props) {
  const [open, setOpen] = useState(false);

  if (permissions.length === 0) {
    return <span>—</span>;
  }

  const joined = permissions.map((p) => p.serviceName).join(", ");

  if (joined.length <= MAX_CHARS) {
    return <span>{joined}</span>;
  }

  const truncated = joined.slice(0, MAX_CHARS);

  return (
    <>
      <span>
        {truncated}…{" "}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-blue-600 hover:text-blue-800 hover:underline text-sm"
        >
          more
        </button>
      </span>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl p-6 w-80 max-h-[70vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-gray-900 mb-3">
              操作権限 ({permissions.length} 件)
            </h3>
            <ul className="overflow-y-auto space-y-1 flex-1">
              {permissions.map((p, i) => (
                <li
                  key={i}
                  className="text-sm text-gray-700 py-1 border-b border-gray-100 last:border-0"
                >
                  {p.serviceName}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
