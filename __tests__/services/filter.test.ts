import { describe, it, expect, beforeEach } from "vitest";
import { getServiceStatus } from "@/lib/services/status";
import { filterServicesByStatus } from "@/lib/services/filter";
import type { ServiceInfo } from "@/lib/ecs";
import {
  buildService,
  buildServiceWithName,
  buildRunningService,
  buildStartingService,
  buildStoppingService,
  buildStoppedService,
} from "@/src/test-utils/services";

// ──────────────────────────────────────────────────────────────────
// getServiceStatus
// ステータス判定ロジック: desiredCount / runningCount の組み合わせから
// "running" | "starting" | "stopping" | "stopped" を返す純粋関数
// ──────────────────────────────────────────────────────────────────
describe("getServiceStatus", () => {
  describe("停止中 (stopped) の判定", () => {
    let service: ServiceInfo;

    beforeEach(() => {
      // desiredCount=0, runningCount=0 → 完全停止状態
      service = buildService({ desiredCount: 0, runningCount: 0 });
    });

    it("desiredCount=0 かつ runningCount=0 の時、'stopped' を返すこと", () => {
      const result = getServiceStatus(service);

      expect(result).toBe("stopped");
    });
  });

  describe("停止処理中 (stopping) の判定", () => {
    describe("runningCount=1 の場合", () => {
      let service: ServiceInfo;

      beforeEach(() => {
        // desired を 0 にしたがまだ 1 タスクが残っている状態
        service = buildService({ desiredCount: 0, runningCount: 1 });
      });

      it("desiredCount=0 かつ runningCount=1 の時、'stopping' を返すこと", () => {
        const result = getServiceStatus(service);

        expect(result).toBe("stopping");
      });
    });

    describe("runningCount が複数の場合", () => {
      let service: ServiceInfo;

      beforeEach(() => {
        // 複数タスクが停止途中の状態
        service = buildService({ desiredCount: 0, runningCount: 3 });
      });

      it("desiredCount=0 かつ runningCount が複数の時、'stopping' を返すこと", () => {
        const result = getServiceStatus(service);

        expect(result).toBe("stopping");
      });
    });
  });

  describe("起動処理中 (starting) の判定", () => {
    describe("desiredCount=1 かつ runningCount=0 の場合", () => {
      let service: ServiceInfo;

      beforeEach(() => {
        // タスク起動を指示したがまだ 1 つも起動していない状態
        service = buildService({ desiredCount: 1, runningCount: 0 });
      });

      it("desiredCount=1 かつ runningCount=0 の時、'starting' を返すこと", () => {
        const result = getServiceStatus(service);

        expect(result).toBe("starting");
      });
    });

    describe("desiredCount=3 かつ runningCount=1 の場合", () => {
      let service: ServiceInfo;

      beforeEach(() => {
        // 一部のタスクのみ起動済みでスケールアップ途中の状態
        service = buildService({ desiredCount: 3, runningCount: 1 });
      });

      it("desiredCount=3 かつ runningCount=1 の時、'starting' を返すこと", () => {
        const result = getServiceStatus(service);

        expect(result).toBe("starting");
      });
    });

    describe("desiredCount=3 かつ runningCount=2 の場合", () => {
      let service: ServiceInfo;

      beforeEach(() => {
        // desired より 1 つ足りない状態（runningCount < desiredCount の境界）
        service = buildService({ desiredCount: 3, runningCount: 2 });
      });

      it("desiredCount=3 かつ runningCount=2 の時、'starting' を返すこと", () => {
        const result = getServiceStatus(service);

        expect(result).toBe("starting");
      });
    });
  });

  describe("起動中 (running) の判定", () => {
    describe("desiredCount=1 かつ runningCount=1 の場合", () => {
      let service: ServiceInfo;

      beforeEach(() => {
        // desired と running が一致している基本ケース
        service = buildService({ desiredCount: 1, runningCount: 1 });
      });

      it("desiredCount=1 かつ runningCount=1 の時、'running' を返すこと", () => {
        const result = getServiceStatus(service);

        expect(result).toBe("running");
      });
    });

    describe("desiredCount=3 かつ runningCount=3 の場合", () => {
      let service: ServiceInfo;

      beforeEach(() => {
        // 複数タスクがすべて起動済みの状態
        service = buildService({ desiredCount: 3, runningCount: 3 });
      });

      it("desiredCount=3 かつ runningCount=3 の時、'running' を返すこと", () => {
        const result = getServiceStatus(service);

        expect(result).toBe("running");
      });
    });

    describe("desiredCount=1 かつ runningCount=2 の場合", () => {
      let service: ServiceInfo;

      beforeEach(() => {
        // ローリングデプロイ中など runningCount が desiredCount を超える過渡状態
        // runningCount >= desiredCount かつ desiredCount > 0 は running として扱う
        service = buildService({ desiredCount: 1, runningCount: 2 });
      });

      it("desiredCount=1 かつ runningCount=2 の時、'running' を返すこと", () => {
        const result = getServiceStatus(service);

        expect(result).toBe("running");
      });
    });
  });
});

// ──────────────────────────────────────────────────────────────────
// filterServicesByStatus
// ServiceInfo[] をステータスグループで絞り込む純粋関数
//   "all"     : 絞り込みなし
//   "running" : desiredCount > 0 （起動中 + 起動処理中）
//   "stopped" : desiredCount = 0 （停止中 + 停止処理中）
// ──────────────────────────────────────────────────────────────────
describe("filterServicesByStatus", () => {
  // ----------------------------------------------------------------
  // フィルタ値: "all"
  // ----------------------------------------------------------------
  describe("フィルタ値が 'all' の時", () => {
    describe("サービスリストが空の場合", () => {
      let services: ServiceInfo[];

      beforeEach(() => {
        services = [];
      });

      it("空のサービスリストを渡した時、空配列を返すこと", () => {
        const result = filterServicesByStatus(services, "all");

        expect(result).toEqual([]);
      });
    });

    describe("サービスが 1 件の場合", () => {
      let services: ServiceInfo[];

      beforeEach(() => {
        services = [buildRunningService()];
      });

      it("サービスが 1 件だけの時、そのサービスを返すこと", () => {
        const result = filterServicesByStatus(services, "all");

        expect(result).toHaveLength(1);
        expect(result[0]).toBe(services[0]);
      });
    });

    describe("4 種類のステータスが混在する場合", () => {
      let services: ServiceInfo[];

      beforeEach(() => {
        services = [
          buildRunningService("svc-running"),
          buildStartingService("svc-starting"),
          buildStoppingService("svc-stopping"),
          buildStoppedService("svc-stopped"),
        ];
      });

      it("起動中・起動処理中・停止処理中・停止中が混在する時、すべてのサービスを返すこと", () => {
        const result = filterServicesByStatus(services, "all");

        expect(result).toHaveLength(4);
        expect(result).toEqual(services);
      });
    });
  });

  // ----------------------------------------------------------------
  // フィルタ値: "running"（起動中 = desiredCount > 0）
  // ----------------------------------------------------------------
  describe("フィルタ値が 'running'（起動中）の時", () => {
    describe("サービスリストが空の場合", () => {
      let services: ServiceInfo[];

      beforeEach(() => {
        services = [];
      });

      it("空のサービスリストを渡した時、空配列を返すこと", () => {
        const result = filterServicesByStatus(services, "running");

        expect(result).toEqual([]);
      });
    });

    describe("起動中（running）のサービスのみの場合", () => {
      let services: ServiceInfo[];

      beforeEach(() => {
        // desiredCount > 0 かつ runningCount >= desiredCount → 完全起動済み
        services = [buildRunningService()];
      });

      it("desiredCount > 0 かつ runningCount >= desiredCount（起動中）のサービスを返すこと", () => {
        const result = filterServicesByStatus(services, "running");

        expect(result).toHaveLength(1);
        expect(result[0]).toBe(services[0]);
      });
    });

    describe("起動処理中（starting）のサービスのみの場合", () => {
      let services: ServiceInfo[];

      beforeEach(() => {
        // desiredCount > 0 かつ runningCount < desiredCount → 起動途中
        services = [buildStartingService()];
      });

      it("desiredCount > 0 かつ runningCount < desiredCount（起動処理中）のサービスを返すこと", () => {
        const result = filterServicesByStatus(services, "running");

        expect(result).toHaveLength(1);
        expect(result[0]).toBe(services[0]);
      });
    });

    describe("起動中と起動処理中が混在する場合", () => {
      let runningService: ServiceInfo;
      let startingService: ServiceInfo;
      let services: ServiceInfo[];

      beforeEach(() => {
        // desiredCount > 0 であれば状態に関わらずすべて返す
        runningService = buildRunningService("svc-running");
        startingService = buildStartingService("svc-starting");
        services = [runningService, startingService];
      });

      it("起動中と起動処理中が混在する時、両方のサービスを返すこと", () => {
        const result = filterServicesByStatus(services, "running");

        expect(result).toHaveLength(2);
        expect(result).toContain(runningService);
        expect(result).toContain(startingService);
      });
    });

    describe("停止中（stopped）のサービスが含まれる場合", () => {
      let services: ServiceInfo[];

      beforeEach(() => {
        // 完全停止済みサービスは「起動中」フィルタで非表示になる
        services = [buildStoppedService()];
      });

      it("desiredCount = 0 かつ runningCount = 0（停止中）のサービスを除外すること", () => {
        const result = filterServicesByStatus(services, "running");

        expect(result).toHaveLength(0);
      });
    });

    describe("停止処理中（stopping）のサービスが含まれる場合", () => {
      let services: ServiceInfo[];

      beforeEach(() => {
        // 停止途中のサービスも「起動中」フィルタで非表示になる
        services = [buildStoppingService()];
      });

      it("desiredCount = 0 かつ runningCount > 0（停止処理中）のサービスを除外すること", () => {
        const result = filterServicesByStatus(services, "running");

        expect(result).toHaveLength(0);
      });
    });

    describe("すべてのサービスが停止系の場合", () => {
      let services: ServiceInfo[];

      beforeEach(() => {
        // 「起動中」グループに該当するサービスがゼロの場合
        services = [
          buildStoppedService("svc-stopped-1"),
          buildStoppingService("svc-stopping-1"),
        ];
      });

      it("すべてのサービスが停止中・停止処理中の時、空配列を返すこと", () => {
        const result = filterServicesByStatus(services, "running");

        expect(result).toHaveLength(0);
      });
    });

    describe("順序保持の確認", () => {
      let services: ServiceInfo[];

      beforeEach(() => {
        // フィルタは順序を変えてはいけない
        services = [
          buildRunningService("svc-a"),
          buildStoppedService("svc-b"),
          buildStartingService("svc-c"),
        ];
      });

      it("フィルタ後の結果がサービスの元の順序を保持すること", () => {
        const result = filterServicesByStatus(services, "running");

        // svc-a(running) と svc-c(starting) のみ残り、元の順序 a→c を保つ
        expect(result).toHaveLength(2);
        expect(result[0].serviceName).toBe("svc-a");
        expect(result[1].serviceName).toBe("svc-c");
      });
    });
  });

  // ----------------------------------------------------------------
  // フィルタ値: "stopped"（停止中 = desiredCount = 0）
  // ----------------------------------------------------------------
  describe("フィルタ値が 'stopped'（停止中）の時", () => {
    describe("サービスリストが空の場合", () => {
      let services: ServiceInfo[];

      beforeEach(() => {
        services = [];
      });

      it("空のサービスリストを渡した時、空配列を返すこと", () => {
        const result = filterServicesByStatus(services, "stopped");

        expect(result).toEqual([]);
      });
    });

    describe("停止中（stopped）のサービスのみの場合", () => {
      let services: ServiceInfo[];

      beforeEach(() => {
        // desiredCount = 0 かつ runningCount = 0 → 完全停止済み
        services = [buildStoppedService()];
      });

      it("desiredCount = 0 かつ runningCount = 0（停止中）のサービスを返すこと", () => {
        const result = filterServicesByStatus(services, "stopped");

        expect(result).toHaveLength(1);
        expect(result[0]).toBe(services[0]);
      });
    });

    describe("停止処理中（stopping）のサービスのみの場合", () => {
      let services: ServiceInfo[];

      beforeEach(() => {
        // desiredCount = 0 かつ runningCount > 0 → 停止途中
        services = [buildStoppingService()];
      });

      it("desiredCount = 0 かつ runningCount > 0（停止処理中）のサービスを返すこと", () => {
        const result = filterServicesByStatus(services, "stopped");

        expect(result).toHaveLength(1);
        expect(result[0]).toBe(services[0]);
      });
    });

    describe("停止中と停止処理中が混在する場合", () => {
      let stoppedService: ServiceInfo;
      let stoppingService: ServiceInfo;
      let services: ServiceInfo[];

      beforeEach(() => {
        // desiredCount = 0 であれば状態に関わらずすべて返す
        stoppedService = buildStoppedService("svc-stopped");
        stoppingService = buildStoppingService("svc-stopping");
        services = [stoppedService, stoppingService];
      });

      it("停止中と停止処理中が混在する時、両方のサービスを返すこと", () => {
        const result = filterServicesByStatus(services, "stopped");

        expect(result).toHaveLength(2);
        expect(result).toContain(stoppedService);
        expect(result).toContain(stoppingService);
      });
    });

    describe("起動中（running）のサービスが含まれる場合", () => {
      let services: ServiceInfo[];

      beforeEach(() => {
        // 起動済みサービスは「停止中」フィルタで非表示になる
        services = [buildRunningService()];
      });

      it("desiredCount > 0 かつ runningCount >= desiredCount（起動中）のサービスを除外すること", () => {
        const result = filterServicesByStatus(services, "stopped");

        expect(result).toHaveLength(0);
      });
    });

    describe("起動処理中（starting）のサービスが含まれる場合", () => {
      let services: ServiceInfo[];

      beforeEach(() => {
        // 起動途中のサービスも「停止中」フィルタで非表示になる
        services = [buildStartingService()];
      });

      it("desiredCount > 0 かつ runningCount < desiredCount（起動処理中）のサービスを除外すること", () => {
        const result = filterServicesByStatus(services, "stopped");

        expect(result).toHaveLength(0);
      });
    });

    describe("すべてのサービスが起動系の場合", () => {
      let services: ServiceInfo[];

      beforeEach(() => {
        // 「停止中」グループに該当するサービスがゼロの場合
        services = [
          buildRunningService("svc-running-1"),
          buildStartingService("svc-starting-1"),
        ];
      });

      it("すべてのサービスが起動中・起動処理中の時、空配列を返すこと", () => {
        const result = filterServicesByStatus(services, "stopped");

        expect(result).toHaveLength(0);
      });
    });

    describe("順序保持の確認", () => {
      let services: ServiceInfo[];

      beforeEach(() => {
        // フィルタは順序を変えてはいけない
        services = [
          buildStoppedService("svc-a"),
          buildRunningService("svc-b"),
          buildStoppingService("svc-c"),
        ];
      });

      it("フィルタ後の結果がサービスの元の順序を保持すること", () => {
        const result = filterServicesByStatus(services, "stopped");

        // svc-a(stopped) と svc-c(stopping) のみ残り、元の順序 a→c を保つ
        expect(result).toHaveLength(2);
        expect(result[0].serviceName).toBe("svc-a");
        expect(result[1].serviceName).toBe("svc-c");
      });
    });
  });

  // ----------------------------------------------------------------
  // フィルタ値間の整合性
  // ----------------------------------------------------------------
  describe("フィルタ値間の整合性", () => {
    let services: ServiceInfo[];

    beforeEach(() => {
      services = [
        buildRunningService("svc-running"),
        buildStartingService("svc-starting"),
        buildStoppingService("svc-stopping"),
        buildStoppedService("svc-stopped"),
      ];
    });

    it("'running' フィルタ結果と 'stopped' フィルタ結果を合わせると 'all' フィルタ結果と一致すること", () => {
      const runningResult = filterServicesByStatus(services, "running");
      const stoppedResult = filterServicesByStatus(services, "stopped");
      const allResult = filterServicesByStatus(services, "all");

      const combined = [...runningResult, ...stoppedResult];

      expect(combined).toHaveLength(allResult.length);
      allResult.forEach((s) => expect(combined).toContain(s));
    });

    it("'running' フィルタ結果と 'stopped' フィルタ結果に重複（同一サービス）がないこと", () => {
      const runningResult = filterServicesByStatus(services, "running");
      const stoppedResult = filterServicesByStatus(services, "stopped");

      const runningArns = new Set(runningResult.map((s) => s.serviceArn));
      const intersection = stoppedResult.filter((s) =>
        runningArns.has(s.serviceArn)
      );

      expect(intersection).toHaveLength(0);
    });
  });
});
