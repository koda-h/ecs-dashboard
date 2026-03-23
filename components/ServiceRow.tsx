"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge, getServiceStatus } from "@/components/StatusBadge";
import type { ServiceInfo } from "@/lib/ecs";
import { toast } from "sonner";

interface Props {
  service: ServiceInfo;
  onUpdated: () => void;
}

export function ServiceRow({ service, onUpdated }: Props) {
  const [desiredCount, setDesiredCount] = useState(
    service.desiredCount > 0 ? service.desiredCount : 1
  );
  const [updating, setUpdating] = useState(false);

  const status = getServiceStatus(service);
  const isTransitioning = status === "starting" || status === "stopping";

  async function updateService(count: number) {
    setUpdating(true);
    try {
      const res = await fetch("/api/services/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clusterArn: service.clusterArn,
          serviceArn: service.serviceArn,
          desiredCount: count,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "更新に失敗しました");
      }

      toast.success(
        count === 0
          ? `${service.serviceName} を停止しました`
          : `${service.serviceName} の desired count を ${count} に更新しました`
      );
      onUpdated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "更新に失敗しました");
    } finally {
      setUpdating(false);
    }
  }

  const isStopped = status === "stopped";
  const isRunning = status === "running";

  return (
    <tr className="border-b hover:bg-gray-50">
      <td className="px-4 py-3 font-mono text-sm">{service.serviceName}</td>
      <td className="px-4 py-3 text-sm text-gray-600">{service.clusterName}</td>
      <td className="px-4 py-3">
        <StatusBadge service={service} />
      </td>
      <td className="px-4 py-3 text-sm text-center">
        {service.runningCount} / {service.desiredCount}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {/* 起動・停止ボタン */}
          {isStopped ? (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                value={desiredCount}
                onChange={(e) =>
                  setDesiredCount(Math.max(1, parseInt(e.target.value) || 1))
                }
                className="w-16 h-8 text-center"
                disabled={updating}
              />
              <Button
                size="sm"
                variant="default"
                onClick={() => updateService(desiredCount)}
                disabled={updating}
              >
                {updating ? "処理中..." : "起動"}
              </Button>
            </div>
          ) : isRunning ? (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                value={desiredCount}
                onChange={(e) =>
                  setDesiredCount(Math.max(1, parseInt(e.target.value) || 1))
                }
                className="w-16 h-8 text-center"
                disabled={updating}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => updateService(desiredCount)}
                disabled={updating || desiredCount === service.desiredCount}
              >
                {updating ? "処理中..." : "変更"}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => updateService(0)}
                disabled={updating}
              >
                {updating ? "処理中..." : "停止"}
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" disabled>
              処理中...
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}
