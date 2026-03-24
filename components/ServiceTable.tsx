"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import useSWR from "swr";
import { ServiceRow } from "@/components/ServiceRow";
import { Input } from "@/components/ui/input";
import { getServiceStatus } from "@/lib/services/status";
import { filterServicesByStatus } from "@/lib/services/filter";
import type { StatusFilter } from "@/lib/services/filter";
import type { ServiceInfo } from "@/lib/ecs";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Cluster {
  arn: string;
  name: string;
}

const ALL_CLUSTERS = { arn: "all", name: "すべてのクラスター" };

export function ServiceTable() {
  const [selectedCluster, setSelectedCluster] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [clusterInput, setClusterInput] = useState(ALL_CLUSTERS.name);
  const [clusterSearch, setClusterSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const comboboxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (comboboxRef.current && !comboboxRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setClusterSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selectCluster(cluster: { arn: string; name: string }) {
    setSelectedCluster(cluster.arn);
    setClusterInput(cluster.name);
    setClusterSearch("");
    setDropdownOpen(false);
  }

  // クラスター一覧
  const { data: clusterData } = useSWR<{ clusters: Cluster[] }>(
    "/api/clusters",
    fetcher,
    { revalidateOnFocus: false }
  );

  // サービス一覧（選択クラスターに応じて URL が変わる）
  const servicesUrl =
    selectedCluster === "all"
      ? "/api/services"
      : `/api/services?cluster=${encodeURIComponent(selectedCluster)}`;

  const hasTransitioning = useCallback(
    (services: ServiceInfo[]) =>
      services.some((s) => {
        const st = getServiceStatus(s);
        return st === "starting" || st === "stopping";
      }),
    []
  );

  const { data: serviceData, mutate } = useSWR<{ services: ServiceInfo[] }>(
    servicesUrl,
    fetcher,
    {
      refreshInterval: (data) => {
        if (data?.services && hasTransitioning(data.services)) return 10_000;
        return 30_000;
      },
    }
  );

  const services = serviceData?.services ?? [];
  const clusters = clusterData?.clusters ?? [];

  const filtered = filterServicesByStatus(
    services.filter((s) => {
      const matchesCluster =
        selectedCluster === "all" || s.clusterArn === selectedCluster;
      const matchesSearch = s.serviceName
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      return matchesCluster && matchesSearch;
    }),
    statusFilter
  );

  const filteredClusters = [ALL_CLUSTERS, ...clusters].filter((c) =>
    c.name.toLowerCase().includes(clusterSearch.toLowerCase())
  );

  return (
    <div>
      {/* フィルター */}
      <div className="flex gap-4 mb-4">
        {/* クラスター検索コンボボックス */}
        <div ref={comboboxRef} className="relative w-64">
          <input
            type="text"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={dropdownOpen ? clusterSearch : clusterInput}
            placeholder="クラスターを選択・検索"
            onChange={(e) => {
              setClusterSearch(e.target.value);
              setDropdownOpen(true);
            }}
            onFocus={() => {
              setClusterSearch("");
              setDropdownOpen(true);
            }}
          />
          {dropdownOpen && (
            <ul className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover text-popover-foreground shadow-md max-h-60 overflow-y-auto">
              {filteredClusters.length === 0 ? (
                <li className="px-3 py-2 text-sm text-muted-foreground">
                  見つかりません
                </li>
              ) : (
                filteredClusters.map((c) => (
                  <li
                    key={c.arn}
                    className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-500 hover:text-white ${
                      selectedCluster === c.arn ? "font-semibold bg-blue-100 text-blue-800" : ""
                    }`}
                    onMouseDown={() => selectCluster(c)}
                  >
                    {c.name}
                  </li>
                ))
              )}
            </ul>
          )}
        </div>

        <Input
          placeholder="サービス名で絞り込み"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-64"
        />

        {/* 起動ステータスフィルター */}
        <div className="flex items-center gap-1 rounded-md border border-input bg-background p-1">
          {(
            [
              { value: "all", label: "すべて" },
              { value: "running", label: "起動中" },
              { value: "stopped", label: "停止中" },
            ] as const
          ).map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatusFilter(value)}
              className={`px-3 py-1 text-sm rounded transition-colors cursor-pointer ${
                statusFilter === value
                  ? "bg-blue-600 text-white"
                  : "text-black hover:bg-gray-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* テーブル */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-sm font-semibold text-gray-700">
                サービス名
              </th>
              <th className="px-4 py-3 text-sm font-semibold text-gray-700">
                クラスター
              </th>
              <th className="px-4 py-3 text-sm font-semibold text-gray-700">
                ステータス
              </th>
              <th className="px-4 py-3 text-sm font-semibold text-gray-700 text-center">
                実行数 / 希望数
              </th>
              <th className="px-4 py-3 text-sm font-semibold text-gray-700">
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {!serviceData ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  読み込み中...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  サービスが見つかりません
                </td>
              </tr>
            ) : (
              filtered.map((service) => (
                <ServiceRow
                  key={service.serviceArn}
                  service={service}
                  onUpdated={() => mutate()}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-xs text-gray-400 text-right">
        30秒ごとに自動更新（処理中は10秒）
      </p>
    </div>
  );
}
