import { describe, it, expect, beforeEach } from "vitest";
import {
  filterServicesForPermission,
  addServicePermissions,
  removeServicePermissions,
  canOperateService,
  canViewServices,
  canViewService,
  filterServicesByView,
  addViewPermissions,
  removeViewPermissions,
  type ServicePermission,
  type ViewPermission,
} from "@/lib/users/permission";
import type { ServiceInfo } from "@/lib/ecs";
import { buildServiceInCluster } from "@/src/test-utils/services";
import {
  buildServicePermissionInCluster,
  buildViewPermissionInCluster,
} from "@/src/test-utils/users";

// ──────────────────────────────────────────────────────────────────
// サービス操作権限仕様
//
// ロールごとの権限:
//   Admin  : すべての ECS サービスの操作・閲覧が可能
//   Editor : 権限付与されたサービスのみ操作可能、全サービスの閲覧は可能
//   Viewer : 操作不可、全サービスの閲覧のみ可能
//
// ユーザ詳細画面（Editor）では以下の操作が可能:
//   ・操作可能サービスの追加: クラスター名・サービス名で絞り込んでから選択・追加
//   ・操作可能サービスの削除: 一覧からチェックして削除
// ──────────────────────────────────────────────────────────────────

// ──────────────────────────────────────────────────────────────────
// filterServicesForPermission
// 権限追加 UI でのサービス絞り込み。
// 全 ECS サービス一覧をクラスター名・サービス名の部分一致でフィルタする。
// ──────────────────────────────────────────────────────────────────

describe("filterServicesForPermission — クラスター名フィルタ", () => {
  // prod-cluster / staging-cluster に api / web / batch が混在する構成
  let services: ServiceInfo[];

  beforeEach(() => {
    services = [
      buildServiceInCluster("prod-cluster", "api-service"),
      buildServiceInCluster("prod-cluster", "web-service"),
      buildServiceInCluster("staging-cluster", "api-service"),
      buildServiceInCluster("staging-cluster", "batch-service"),
    ];
  });

  it("サービスリストが空の場合、空配列を返すこと", () => {
    const result = filterServicesForPermission([], "prod", "");

    expect(result).toEqual([]);
  });

  it("クラスター名フィルタが空文字の場合、全サービスを返すこと", () => {
    const result = filterServicesForPermission(services, "", "");

    expect(result).toHaveLength(4);
    expect(result).toEqual(services);
  });

  it("クラスター名に部分一致するサービスのみを返すこと", () => {
    // "prod" は "prod-cluster" のみに一致
    const result = filterServicesForPermission(services, "prod", "");

    expect(result).toHaveLength(2);
    result.forEach((s) => expect(s.clusterName).toBe("prod-cluster"));
  });

  it("クラスター名フィルタがどのサービスにも一致しない場合、空配列を返すこと", () => {
    const result = filterServicesForPermission(services, "nonexistent-cluster", "");

    expect(result).toHaveLength(0);
  });

  it("クラスター名フィルタは大文字小文字を区別しないこと", () => {
    // "PROD" でも "prod-cluster" にマッチする
    const resultUpper = filterServicesForPermission(services, "PROD", "");
    const resultLower = filterServicesForPermission(services, "prod", "");

    expect(resultUpper).toHaveLength(resultLower.length);
    expect(resultUpper.map((s) => s.serviceArn)).toEqual(resultLower.map((s) => s.serviceArn));
  });

  it("クラスター名フィルタに前後のスペースが含まれていても一致すること", () => {
    // ユーザのコピペ操作などでスペースが混入しても絞り込みが機能する
    const result = filterServicesForPermission(services, "  prod  ", "");

    expect(result).toHaveLength(2);
    result.forEach((s) => expect(s.clusterName).toBe("prod-cluster"));
  });
});

describe("filterServicesForPermission — サービス名フィルタ", () => {
  let services: ServiceInfo[];

  beforeEach(() => {
    services = [
      buildServiceInCluster("prod-cluster", "api-service"),
      buildServiceInCluster("prod-cluster", "web-service"),
      buildServiceInCluster("staging-cluster", "api-service"),
      buildServiceInCluster("staging-cluster", "batch-service"),
    ];
  });

  it("サービス名フィルタが空文字の場合、全サービスを返すこと", () => {
    const result = filterServicesForPermission(services, "", "");

    expect(result).toHaveLength(4);
  });

  it("サービス名に部分一致するサービスのみを返すこと", () => {
    // "api" は "api-service" のみに一致（2クラスター分）
    const result = filterServicesForPermission(services, "", "api");

    expect(result).toHaveLength(2);
    result.forEach((s) => expect(s.serviceName).toBe("api-service"));
  });

  it("サービス名フィルタがどのサービスにも一致しない場合、空配列を返すこと", () => {
    const result = filterServicesForPermission(services, "", "nonexistent-service");

    expect(result).toHaveLength(0);
  });

  it("サービス名フィルタは大文字小文字を区別しないこと", () => {
    const resultUpper = filterServicesForPermission(services, "", "API");
    const resultLower = filterServicesForPermission(services, "", "api");

    expect(resultUpper).toHaveLength(resultLower.length);
    expect(resultUpper.map((s) => s.serviceArn)).toEqual(resultLower.map((s) => s.serviceArn));
  });

  it("サービス名フィルタに前後のスペースが含まれていても一致すること", () => {
    const result = filterServicesForPermission(services, "", "  api  ");

    expect(result).toHaveLength(2);
    result.forEach((s) => expect(s.serviceName).toBe("api-service"));
  });
});

describe("filterServicesForPermission — クラスター名とサービス名の複合フィルタ", () => {
  let services: ServiceInfo[];

  beforeEach(() => {
    services = [
      buildServiceInCluster("prod-cluster", "api-service"),
      buildServiceInCluster("prod-cluster", "web-service"),
      buildServiceInCluster("staging-cluster", "api-service"),
      buildServiceInCluster("staging-cluster", "batch-service"),
    ];
  });

  it("クラスター名とサービス名の両方に一致するサービスのみを返すこと", () => {
    // "prod" × "api" → prod-cluster/api-service の1件のみ
    const result = filterServicesForPermission(services, "prod", "api");

    expect(result).toHaveLength(1);
    expect(result[0].clusterName).toBe("prod-cluster");
    expect(result[0].serviceName).toBe("api-service");
  });

  it("クラスター名に一致してもサービス名に一致しない場合、空配列を返すこと", () => {
    const result = filterServicesForPermission(services, "prod", "nonexistent");

    expect(result).toHaveLength(0);
  });

  it("サービス名に一致してもクラスター名に一致しない場合、空配列を返すこと", () => {
    const result = filterServicesForPermission(services, "nonexistent", "api");

    expect(result).toHaveLength(0);
  });

  it("両フィルタが空文字の場合、全サービスを返すこと", () => {
    const result = filterServicesForPermission(services, "", "");

    expect(result).toHaveLength(4);
  });
});

describe("filterServicesForPermission — 順序保持", () => {
  let services: ServiceInfo[];

  beforeEach(() => {
    // フィルタで中間の要素が除外されるよう配置
    services = [
      buildServiceInCluster("prod-cluster", "api-service"),    // matches "api"
      buildServiceInCluster("prod-cluster", "web-service"),    // does NOT match "api"
      buildServiceInCluster("staging-cluster", "api-service"), // matches "api"
    ];
  });

  it("フィルタ後の結果が元のリストの順序を保持すること", () => {
    // web-service が除外されても api-service の前後関係は変わらない
    const result = filterServicesForPermission(services, "", "api");

    expect(result).toHaveLength(2);
    expect(result[0].clusterName).toBe("prod-cluster");
    expect(result[1].clusterName).toBe("staging-cluster");
  });
});

// ──────────────────────────────────────────────────────────────────
// addServicePermissions
// チェックしたサービスを操作可能サービス一覧に追加する。
// serviceArn を重複排除のキーとして使用する。
// ──────────────────────────────────────────────────────────────────

describe("addServicePermissions — 基本追加", () => {
  let permA: ServicePermission;
  let permB: ServicePermission;
  let permC: ServicePermission;

  beforeEach(() => {
    permA = buildServicePermissionInCluster("prod-cluster", "api-service");
    permB = buildServicePermissionInCluster("prod-cluster", "web-service");
    permC = buildServicePermissionInCluster("staging-cluster", "api-service");
  });

  it("操作可能サービス一覧が空の場合、追加したサービスが一覧に含まれること", () => {
    const result = addServicePermissions([], [permA]);

    expect(result).toHaveLength(1);
    expect(result[0].serviceArn).toBe(permA.serviceArn);
  });

  it("既存の一覧に新しいサービスを追加すると、そのサービスが一覧に追加されること", () => {
    const result = addServicePermissions([permA], [permC]);

    expect(result).toHaveLength(2);
    expect(result.map((p) => p.serviceArn)).toContain(permC.serviceArn);
  });

  it("複数のサービスを一度に追加できること", () => {
    const result = addServicePermissions([permA], [permB, permC]);

    expect(result).toHaveLength(3);
  });

  it("追加後も既存のサービスがすべて残ること", () => {
    const result = addServicePermissions([permA, permB], [permC]);

    expect(result.map((p) => p.serviceArn)).toContain(permA.serviceArn);
    expect(result.map((p) => p.serviceArn)).toContain(permB.serviceArn);
  });

  it("空のリストを追加しても一覧が変化しないこと", () => {
    const result = addServicePermissions([permA, permB], []);

    expect(result).toHaveLength(2);
    expect(result.map((p) => p.serviceArn)).toEqual([permA.serviceArn, permB.serviceArn]);
  });
});

describe("addServicePermissions — 重複排除", () => {
  let permA: ServicePermission;
  let permB: ServicePermission;
  let permC: ServicePermission;

  beforeEach(() => {
    permA = buildServicePermissionInCluster("prod-cluster", "api-service");
    permB = buildServicePermissionInCluster("prod-cluster", "web-service");
    permC = buildServicePermissionInCluster("staging-cluster", "api-service");
  });

  it("既に一覧にあるサービスを再度追加しても一覧に1件しか含まれないこと", () => {
    // permA は既存の一覧に含まれているため、追加しても増えない
    const result = addServicePermissions([permA, permB], [permA]);

    expect(result).toHaveLength(2);
    const arns = result.map((p) => p.serviceArn);
    expect(arns.filter((a) => a === permA.serviceArn)).toHaveLength(1);
  });

  it("追加リスト内に同一サービスが重複していても一覧に1件しか含まれないこと", () => {
    // toAdd 内の permC が重複していても1件に収まる
    const result = addServicePermissions([permA], [permC, permC]);

    expect(result).toHaveLength(2);
    const arns = result.map((p) => p.serviceArn);
    expect(arns.filter((a) => a === permC.serviceArn)).toHaveLength(1);
  });

  it("一部が既存と重複するリストを追加した場合、重複分は1件に統合されること", () => {
    // permA は既存、permC は新規 → permA の重複を除いて permC だけ追加
    const result = addServicePermissions([permA, permB], [permA, permC]);

    expect(result).toHaveLength(3);
    const arns = result.map((p) => p.serviceArn);
    expect(arns.filter((a) => a === permA.serviceArn)).toHaveLength(1);
    expect(arns).toContain(permC.serviceArn);
  });
});

describe("addServicePermissions — 順序", () => {
  let permA: ServicePermission;
  let permB: ServicePermission;
  let permC: ServicePermission;

  beforeEach(() => {
    permA = buildServicePermissionInCluster("prod-cluster", "api-service");
    permB = buildServicePermissionInCluster("prod-cluster", "web-service");
    permC = buildServicePermissionInCluster("staging-cluster", "api-service");
  });

  it("追加前の既存サービスの順序が維持されること", () => {
    const result = addServicePermissions([permA, permB], [permC]);

    // 先頭2件は元の順序のまま
    expect(result[0].serviceArn).toBe(permA.serviceArn);
    expect(result[1].serviceArn).toBe(permB.serviceArn);
  });

  it("新しいサービスは既存サービスの後に追加されること", () => {
    const result = addServicePermissions([permA, permB], [permC]);

    // permC は末尾に追加される
    expect(result[result.length - 1].serviceArn).toBe(permC.serviceArn);
  });
});

// ──────────────────────────────────────────────────────────────────
// removeServicePermissions
// チェックされたサービスを操作可能サービス一覧から削除する。
// ──────────────────────────────────────────────────────────────────

describe("removeServicePermissions — 基本削除", () => {
  let permA: ServicePermission;
  let permB: ServicePermission;
  let permC: ServicePermission;

  beforeEach(() => {
    permA = buildServicePermissionInCluster("prod-cluster", "api-service");
    permB = buildServicePermissionInCluster("prod-cluster", "web-service");
    permC = buildServicePermissionInCluster("staging-cluster", "api-service");
  });

  it("指定したサービスが一覧から削除されること", () => {
    const result = removeServicePermissions([permA, permB, permC], [permB]);

    expect(result).toHaveLength(2);
    expect(result.map((p) => p.serviceArn)).not.toContain(permB.serviceArn);
  });

  it("複数のサービスを一度に削除できること", () => {
    const result = removeServicePermissions([permA, permB, permC], [permA, permC]);

    expect(result).toHaveLength(1);
    expect(result[0].serviceArn).toBe(permB.serviceArn);
  });

  it("削除後も残るべきサービスはすべて変化しないこと", () => {
    const result = removeServicePermissions([permA, permB, permC], [permB]);

    // permA と permC は削除対象でないため残る
    expect(result.map((p) => p.serviceArn)).toContain(permA.serviceArn);
    expect(result.map((p) => p.serviceArn)).toContain(permC.serviceArn);
  });
});

describe("removeServicePermissions — 境界条件", () => {
  let permA: ServicePermission;
  let permB: ServicePermission;
  let permD: ServicePermission;

  beforeEach(() => {
    permA = buildServicePermissionInCluster("prod-cluster", "api-service");
    permB = buildServicePermissionInCluster("prod-cluster", "web-service");
    permD = buildServicePermissionInCluster("staging-cluster", "batch-service"); // 一覧に存在しない
  });

  it("存在しないサービスを削除しようとしても一覧が変化しないこと", () => {
    const result = removeServicePermissions([permA, permB], [permD]);

    expect(result).toHaveLength(2);
    expect(result.map((p) => p.serviceArn)).toEqual([permA.serviceArn, permB.serviceArn]);
  });

  it("空の一覧から削除しようとしても空のまま返ること", () => {
    const result = removeServicePermissions([], [permA]);

    expect(result).toHaveLength(0);
  });

  it("空の削除リストを渡しても一覧が変化しないこと", () => {
    const result = removeServicePermissions([permA, permB], []);

    expect(result).toHaveLength(2);
    expect(result.map((p) => p.serviceArn)).toEqual([permA.serviceArn, permB.serviceArn]);
  });

  it("一覧にある全サービスを削除すると空配列が返ること", () => {
    const result = removeServicePermissions([permA, permB], [permA, permB]);

    expect(result).toHaveLength(0);
  });
});

describe("removeServicePermissions — 順序", () => {
  let permA: ServicePermission;
  let permB: ServicePermission;
  let permC: ServicePermission;
  let permD: ServicePermission;

  beforeEach(() => {
    permA = buildServicePermissionInCluster("prod-cluster", "api-service");
    permB = buildServicePermissionInCluster("prod-cluster", "web-service");
    permC = buildServicePermissionInCluster("staging-cluster", "api-service");
    permD = buildServicePermissionInCluster("staging-cluster", "batch-service");
  });

  it("削除後の残りサービスが元の順序を保持すること", () => {
    // B を削除しても A → C → D の相対順序は変わらない
    const result = removeServicePermissions([permA, permB, permC, permD], [permB]);

    expect(result).toHaveLength(3);
    expect(result[0].serviceArn).toBe(permA.serviceArn);
    expect(result[1].serviceArn).toBe(permC.serviceArn);
    expect(result[2].serviceArn).toBe(permD.serviceArn);
  });
});

// ──────────────────────────────────────────────────────────────────
// canOperateService
// ユーザのロールと操作権限リストに基づいて、
// 特定の ECS サービスへの操作（起動・停止・台数変更）が可能かどうかを判定する。
// ──────────────────────────────────────────────────────────────────

describe("canOperateService — Admin ロール", () => {
  let allowedPerm: ServicePermission;

  beforeEach(() => {
    allowedPerm = buildServicePermissionInCluster("prod-cluster", "api-service");
  });

  it("Admin ロールのユーザは権限リストが空でも任意のサービスを操作できること", () => {
    // Admin は権限リストに関わらず全サービスを操作できる
    const result = canOperateService("Admin", [], allowedPerm.serviceArn);

    expect(result).toBe(true);
  });

  it("Admin ロールのユーザは権限リストに含まれていないサービスも操作できること", () => {
    const otherArn = buildServicePermissionInCluster("staging-cluster", "batch-service").serviceArn;
    const result = canOperateService("Admin", [allowedPerm], otherArn);

    expect(result).toBe(true);
  });
});

describe("canOperateService — Editor ロール", () => {
  let allowedPerm: ServicePermission;
  let notAllowedArn: string;

  beforeEach(() => {
    allowedPerm = buildServicePermissionInCluster("prod-cluster", "api-service");
    notAllowedArn = buildServicePermissionInCluster("staging-cluster", "batch-service").serviceArn;
  });

  it("Editor ロールのユーザは権限リストに含まれているサービスを操作できること", () => {
    const result = canOperateService("Editor", [allowedPerm], allowedPerm.serviceArn);

    expect(result).toBe(true);
  });

  it("Editor ロールのユーザは権限リストに含まれていないサービスを操作できないこと", () => {
    const result = canOperateService("Editor", [allowedPerm], notAllowedArn);

    expect(result).toBe(false);
  });

  it("Editor ロールのユーザで権限リストが空の場合、どのサービスも操作できないこと", () => {
    const result = canOperateService("Editor", [], allowedPerm.serviceArn);

    expect(result).toBe(false);
  });
});

describe("canOperateService — Viewer ロール", () => {
  let perm: ServicePermission;

  beforeEach(() => {
    perm = buildServicePermissionInCluster("prod-cluster", "api-service");
  });

  it("Viewer ロールのユーザは権限リストに含まれているサービスでも操作できないこと", () => {
    // Viewer は権限リストに関わらず操作不可
    const result = canOperateService("Viewer", [perm], perm.serviceArn);

    expect(result).toBe(false);
  });

  it("Viewer ロールのユーザは権限リストが空の場合、どのサービスも操作できないこと", () => {
    const result = canOperateService("Viewer", [], perm.serviceArn);

    expect(result).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────
// canViewServices
// 全ロールがサービスの閲覧を行えることを確認する。
// ──────────────────────────────────────────────────────────────────

describe("canViewServices — 閲覧権限", () => {
  it("Admin ロールのユーザはサービスを閲覧できること", () => {
    expect(canViewServices("Admin")).toBe(true);
  });

  it("Editor ロールのユーザはサービスを閲覧できること", () => {
    expect(canViewServices("Editor")).toBe(true);
  });

  it("Viewer ロールのユーザはサービスを閲覧できること", () => {
    expect(canViewServices("Viewer")).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────
// canViewService
// ロール・viewMode・閲覧権限・操作権限に基づいて、
// 特定の ECS サービスの閲覧が可能かどうかを判定する。
//
// viewMode の仕様:
//   ALL    : 全サービスを表示（デフォルト）
//   SYNC   : 操作権限リストのサービスと連動（Editor 専用）
//   CUSTOM : viewPermissions に登録されたサービスのみ表示
// ──────────────────────────────────────────────────────────────────

describe("canViewService — Admin ロール", () => {
  let perm: ServicePermission;
  let viewPerm: ViewPermission;

  beforeEach(() => {
    perm = buildServicePermissionInCluster("prod-cluster", "api-service");
    viewPerm = buildViewPermissionInCluster("prod-cluster", "api-service");
  });

  it("Admin は viewMode が ALL のとき任意のサービスを閲覧できること", () => {
    expect(canViewService("Admin", "ALL", [], [], perm.serviceArn)).toBe(true);
  });

  it("Admin は viewMode が SYNC のとき任意のサービスを閲覧できること", () => {
    expect(canViewService("Admin", "SYNC", [], [], perm.serviceArn)).toBe(true);
  });

  it("Admin は viewMode が CUSTOM のとき任意のサービスを閲覧できること", () => {
    expect(canViewService("Admin", "CUSTOM", [], [], perm.serviceArn)).toBe(true);
  });

  it("Admin は viewPermissions が空でも任意のサービスを閲覧できること", () => {
    expect(canViewService("Admin", "CUSTOM", [], [], perm.serviceArn)).toBe(true);
  });

  it("Admin は operationPermissions が空でも任意のサービスを閲覧できること", () => {
    expect(canViewService("Admin", "SYNC", [viewPerm], [], perm.serviceArn)).toBe(true);
  });
});

describe("canViewService — Editor / viewMode: ALL", () => {
  let perm: ServicePermission;

  beforeEach(() => {
    perm = buildServicePermissionInCluster("prod-cluster", "api-service");
  });

  it("Editor で viewMode が ALL のとき、任意のサービスを閲覧できること", () => {
    expect(canViewService("Editor", "ALL", [], [], perm.serviceArn)).toBe(true);
  });

  it("Editor で viewMode が ALL のとき、viewPermissions が空でも閲覧できること", () => {
    expect(canViewService("Editor", "ALL", [], [perm], perm.serviceArn)).toBe(true);
  });

  it("Editor で viewMode が ALL のとき、operationPermissions が空でも閲覧できること", () => {
    expect(canViewService("Editor", "ALL", [], [], perm.serviceArn)).toBe(true);
  });
});

describe("canViewService — Editor / viewMode: SYNC", () => {
  let opPerm: ServicePermission;
  let otherArn: string;

  beforeEach(() => {
    opPerm = buildServicePermissionInCluster("prod-cluster", "api-service");
    otherArn = buildServicePermissionInCluster("staging-cluster", "batch-service").serviceArn;
  });

  it("Editor で viewMode が SYNC のとき、operationPermissions に含まれるサービスを閲覧できること", () => {
    expect(canViewService("Editor", "SYNC", [], [opPerm], opPerm.serviceArn)).toBe(true);
  });

  it("Editor で viewMode が SYNC のとき、operationPermissions に含まれないサービスは閲覧できないこと", () => {
    expect(canViewService("Editor", "SYNC", [], [opPerm], otherArn)).toBe(false);
  });

  it("Editor で viewMode が SYNC のとき、operationPermissions が空の場合どのサービスも閲覧できないこと", () => {
    expect(canViewService("Editor", "SYNC", [], [], opPerm.serviceArn)).toBe(false);
  });

  it("Editor で viewMode が SYNC のとき、viewPermissions の内容は無視されること", () => {
    // viewPermissions に otherArn が含まれていても SYNC は operationPermissions を参照する
    const viewPerm = buildViewPermissionInCluster("staging-cluster", "batch-service");
    expect(canViewService("Editor", "SYNC", [viewPerm], [opPerm], otherArn)).toBe(false);
  });
});

describe("canViewService — Editor / viewMode: CUSTOM", () => {
  let viewPerm: ViewPermission;
  let otherArn: string;

  beforeEach(() => {
    viewPerm = buildViewPermissionInCluster("prod-cluster", "api-service");
    otherArn = buildServicePermissionInCluster("staging-cluster", "batch-service").serviceArn;
  });

  it("Editor で viewMode が CUSTOM のとき、viewPermissions に含まれるサービスを閲覧できること", () => {
    expect(canViewService("Editor", "CUSTOM", [viewPerm], [], viewPerm.serviceArn)).toBe(true);
  });

  it("Editor で viewMode が CUSTOM のとき、viewPermissions に含まれないサービスは閲覧できないこと", () => {
    expect(canViewService("Editor", "CUSTOM", [viewPerm], [], otherArn)).toBe(false);
  });

  it("Editor で viewMode が CUSTOM のとき、viewPermissions が空の場合どのサービスも閲覧できないこと", () => {
    expect(canViewService("Editor", "CUSTOM", [], [], viewPerm.serviceArn)).toBe(false);
  });

  it("Editor で viewMode が CUSTOM のとき、operationPermissions の内容は無視されること", () => {
    // operationPermissions に otherArn が含まれていても CUSTOM は viewPermissions を参照する
    const opPerm = buildServicePermissionInCluster("staging-cluster", "batch-service");
    expect(canViewService("Editor", "CUSTOM", [viewPerm], [opPerm], otherArn)).toBe(false);
  });
});

describe("canViewService — Viewer / viewMode: ALL", () => {
  let viewPerm: ViewPermission;

  beforeEach(() => {
    viewPerm = buildViewPermissionInCluster("prod-cluster", "api-service");
  });

  it("Viewer で viewMode が ALL のとき、任意のサービスを閲覧できること", () => {
    expect(canViewService("Viewer", "ALL", [], [], viewPerm.serviceArn)).toBe(true);
  });

  it("Viewer で viewMode が ALL のとき、viewPermissions が空でも閲覧できること", () => {
    expect(canViewService("Viewer", "ALL", [], [], viewPerm.serviceArn)).toBe(true);
  });
});

describe("canViewService — Viewer / viewMode: CUSTOM", () => {
  let viewPerm: ViewPermission;
  let otherArn: string;

  beforeEach(() => {
    viewPerm = buildViewPermissionInCluster("prod-cluster", "api-service");
    otherArn = buildServicePermissionInCluster("staging-cluster", "batch-service").serviceArn;
  });

  it("Viewer で viewMode が CUSTOM のとき、viewPermissions に含まれるサービスを閲覧できること", () => {
    expect(canViewService("Viewer", "CUSTOM", [viewPerm], [], viewPerm.serviceArn)).toBe(true);
  });

  it("Viewer で viewMode が CUSTOM のとき、viewPermissions に含まれないサービスは閲覧できないこと", () => {
    expect(canViewService("Viewer", "CUSTOM", [viewPerm], [], otherArn)).toBe(false);
  });

  it("Viewer で viewMode が CUSTOM のとき、viewPermissions が空の場合どのサービスも閲覧できないこと", () => {
    expect(canViewService("Viewer", "CUSTOM", [], [], viewPerm.serviceArn)).toBe(false);
  });
});

describe("canViewService — Viewer / viewMode: SYNC（エッジケース）", () => {
  it("Viewer で viewMode が SYNC のとき、operationPermissions は常に空のためどのサービスも閲覧できないこと", () => {
    // Viewer に操作権限は付与されないため operationPermissions は空。
    // SYNC は operationPermissions を参照するので全サービス閲覧不可。
    const serviceArn = buildServicePermissionInCluster("prod-cluster", "api-service").serviceArn;
    expect(canViewService("Viewer", "SYNC", [], [], serviceArn)).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────
// filterServicesByView
// viewMode・閲覧権限・操作権限に基づいてサービスリストをフィルタリングする。
// ──────────────────────────────────────────────────────────────────

describe("filterServicesByView — Admin ロール", () => {
  let services: ServiceInfo[];

  beforeEach(() => {
    services = [
      buildServiceInCluster("prod-cluster", "api-service"),
      buildServiceInCluster("prod-cluster", "web-service"),
      buildServiceInCluster("staging-cluster", "batch-service"),
    ];
  });

  it("Admin のとき、サービスリストがそのまま返ること", () => {
    const result = filterServicesByView(services, "Admin", "CUSTOM", [], []);

    expect(result).toEqual(services);
  });

  it("Admin のとき、viewMode・viewPermissions・operationPermissions の内容に関わらず全サービスが返ること", () => {
    const result = filterServicesByView(services, "Admin", "CUSTOM", [], []);

    expect(result).toHaveLength(3);
  });
});

describe("filterServicesByView — Editor / viewMode: ALL", () => {
  let services: ServiceInfo[];

  beforeEach(() => {
    services = [
      buildServiceInCluster("prod-cluster", "api-service"),
      buildServiceInCluster("prod-cluster", "web-service"),
    ];
  });

  it("viewMode が ALL のとき、サービスリストがそのまま返ること", () => {
    const result = filterServicesByView(services, "Editor", "ALL", [], []);

    expect(result).toEqual(services);
  });

  it("viewMode が ALL のとき、サービスリストが空の場合空配列を返すこと", () => {
    const result = filterServicesByView([], "Editor", "ALL", [], []);

    expect(result).toHaveLength(0);
  });
});

describe("filterServicesByView — Editor / viewMode: SYNC", () => {
  let services: ServiceInfo[];
  let opPermApi: ServicePermission;
  let opPermWeb: ServicePermission;

  beforeEach(() => {
    services = [
      buildServiceInCluster("prod-cluster", "api-service"),
      buildServiceInCluster("prod-cluster", "web-service"),
      buildServiceInCluster("staging-cluster", "batch-service"),
    ];
    opPermApi = buildServicePermissionInCluster("prod-cluster", "api-service");
    opPermWeb = buildServicePermissionInCluster("prod-cluster", "web-service");
  });

  it("viewMode が SYNC のとき、operationPermissions に含まれるサービスのみが返ること", () => {
    const result = filterServicesByView(services, "Editor", "SYNC", [], [opPermApi]);

    expect(result).toHaveLength(1);
    expect(result[0].serviceName).toBe("api-service");
  });

  it("viewMode が SYNC のとき、operationPermissions に含まれないサービスが除外されること", () => {
    const result = filterServicesByView(services, "Editor", "SYNC", [], [opPermApi]);

    expect(result.map((s) => s.serviceName)).not.toContain("batch-service");
  });

  it("viewMode が SYNC のとき、operationPermissions が空の場合空配列を返すこと", () => {
    const result = filterServicesByView(services, "Editor", "SYNC", [], []);

    expect(result).toHaveLength(0);
  });

  it("viewMode が SYNC のとき、複数サービスのうち一部だけ権限がある場合、権限のあるものだけが返ること", () => {
    const result = filterServicesByView(services, "Editor", "SYNC", [], [opPermApi, opPermWeb]);

    expect(result).toHaveLength(2);
    expect(result.map((s) => s.serviceName)).toContain("api-service");
    expect(result.map((s) => s.serviceName)).toContain("web-service");
    expect(result.map((s) => s.serviceName)).not.toContain("batch-service");
  });

  it("viewMode が SYNC のとき、フィルタ後も元のサービスリストの順序が保持されること", () => {
    const result = filterServicesByView(services, "Editor", "SYNC", [], [opPermApi, opPermWeb]);

    expect(result[0].serviceName).toBe("api-service");
    expect(result[1].serviceName).toBe("web-service");
  });
});

describe("filterServicesByView — Editor / viewMode: CUSTOM", () => {
  let services: ServiceInfo[];
  let viewPermApi: ViewPermission;
  let viewPermWeb: ViewPermission;

  beforeEach(() => {
    services = [
      buildServiceInCluster("prod-cluster", "api-service"),
      buildServiceInCluster("prod-cluster", "web-service"),
      buildServiceInCluster("staging-cluster", "batch-service"),
    ];
    viewPermApi = buildViewPermissionInCluster("prod-cluster", "api-service");
    viewPermWeb = buildViewPermissionInCluster("prod-cluster", "web-service");
  });

  it("viewMode が CUSTOM のとき、viewPermissions に含まれるサービスのみが返ること", () => {
    const result = filterServicesByView(services, "Editor", "CUSTOM", [viewPermApi], []);

    expect(result).toHaveLength(1);
    expect(result[0].serviceName).toBe("api-service");
  });

  it("viewMode が CUSTOM のとき、viewPermissions に含まれないサービスが除外されること", () => {
    const result = filterServicesByView(services, "Editor", "CUSTOM", [viewPermApi], []);

    expect(result.map((s) => s.serviceName)).not.toContain("batch-service");
  });

  it("viewMode が CUSTOM のとき、viewPermissions が空の場合空配列を返すこと", () => {
    const result = filterServicesByView(services, "Editor", "CUSTOM", [], []);

    expect(result).toHaveLength(0);
  });

  it("viewMode が CUSTOM のとき、複数サービスのうち一部だけ閲覧権限がある場合、閲覧権限のあるものだけが返ること", () => {
    const result = filterServicesByView(services, "Editor", "CUSTOM", [viewPermApi, viewPermWeb], []);

    expect(result).toHaveLength(2);
    expect(result.map((s) => s.serviceName)).toContain("api-service");
    expect(result.map((s) => s.serviceName)).toContain("web-service");
    expect(result.map((s) => s.serviceName)).not.toContain("batch-service");
  });

  it("viewMode が CUSTOM のとき、フィルタ後も元のサービスリストの順序が保持されること", () => {
    const result = filterServicesByView(services, "Editor", "CUSTOM", [viewPermApi, viewPermWeb], []);

    expect(result[0].serviceName).toBe("api-service");
    expect(result[1].serviceName).toBe("web-service");
  });
});

describe("filterServicesByView — Viewer / viewMode: ALL", () => {
  let services: ServiceInfo[];

  beforeEach(() => {
    services = [
      buildServiceInCluster("prod-cluster", "api-service"),
      buildServiceInCluster("prod-cluster", "web-service"),
    ];
  });

  it("Viewer で viewMode が ALL のとき、サービスリストがそのまま返ること", () => {
    const result = filterServicesByView(services, "Viewer", "ALL", [], []);

    expect(result).toEqual(services);
  });
});

describe("filterServicesByView — Viewer / viewMode: CUSTOM", () => {
  let services: ServiceInfo[];
  let viewPermApi: ViewPermission;

  beforeEach(() => {
    services = [
      buildServiceInCluster("prod-cluster", "api-service"),
      buildServiceInCluster("prod-cluster", "web-service"),
    ];
    viewPermApi = buildViewPermissionInCluster("prod-cluster", "api-service");
  });

  it("Viewer で viewMode が CUSTOM のとき、viewPermissions に含まれるサービスのみが返ること", () => {
    const result = filterServicesByView(services, "Viewer", "CUSTOM", [viewPermApi], []);

    expect(result).toHaveLength(1);
    expect(result[0].serviceName).toBe("api-service");
  });

  it("Viewer で viewMode が CUSTOM のとき、viewPermissions が空の場合空配列を返すこと", () => {
    const result = filterServicesByView(services, "Viewer", "CUSTOM", [], []);

    expect(result).toHaveLength(0);
  });
});

// ──────────────────────────────────────────────────────────────────
// addViewPermissions
// チェックしたサービスを閲覧権限一覧に追加する。
// serviceArn を重複排除のキーとして使用する。
// ──────────────────────────────────────────────────────────────────

describe("addViewPermissions — 基本追加", () => {
  let viewA: ViewPermission;
  let viewB: ViewPermission;
  let viewC: ViewPermission;

  beforeEach(() => {
    viewA = buildViewPermissionInCluster("prod-cluster", "api-service");
    viewB = buildViewPermissionInCluster("prod-cluster", "web-service");
    viewC = buildViewPermissionInCluster("staging-cluster", "api-service");
  });

  it("閲覧権限一覧が空の場合、追加したサービスが一覧に含まれること", () => {
    const result = addViewPermissions([], [viewA]);

    expect(result).toHaveLength(1);
    expect(result[0].serviceArn).toBe(viewA.serviceArn);
  });

  it("既存の一覧に新しいサービスを追加すると、そのサービスが一覧に追加されること", () => {
    const result = addViewPermissions([viewA], [viewC]);

    expect(result).toHaveLength(2);
    expect(result.map((p) => p.serviceArn)).toContain(viewC.serviceArn);
  });

  it("複数のサービスを一度に追加できること", () => {
    const result = addViewPermissions([viewA], [viewB, viewC]);

    expect(result).toHaveLength(3);
  });

  it("追加後も既存のサービスがすべて残ること", () => {
    const result = addViewPermissions([viewA, viewB], [viewC]);

    expect(result.map((p) => p.serviceArn)).toContain(viewA.serviceArn);
    expect(result.map((p) => p.serviceArn)).toContain(viewB.serviceArn);
  });

  it("空のリストを追加しても一覧が変化しないこと", () => {
    const result = addViewPermissions([viewA, viewB], []);

    expect(result).toHaveLength(2);
    expect(result.map((p) => p.serviceArn)).toEqual([viewA.serviceArn, viewB.serviceArn]);
  });
});

describe("addViewPermissions — 重複排除", () => {
  let viewA: ViewPermission;
  let viewB: ViewPermission;
  let viewC: ViewPermission;

  beforeEach(() => {
    viewA = buildViewPermissionInCluster("prod-cluster", "api-service");
    viewB = buildViewPermissionInCluster("prod-cluster", "web-service");
    viewC = buildViewPermissionInCluster("staging-cluster", "api-service");
  });

  it("既に一覧にあるサービスを再度追加しても一覧に1件しか含まれないこと", () => {
    const result = addViewPermissions([viewA, viewB], [viewA]);

    expect(result).toHaveLength(2);
    const arns = result.map((p) => p.serviceArn);
    expect(arns.filter((a) => a === viewA.serviceArn)).toHaveLength(1);
  });

  it("追加リスト内に同一サービスが重複していても一覧に1件しか含まれないこと", () => {
    const result = addViewPermissions([viewA], [viewC, viewC]);

    expect(result).toHaveLength(2);
    const arns = result.map((p) => p.serviceArn);
    expect(arns.filter((a) => a === viewC.serviceArn)).toHaveLength(1);
  });
});

describe("addViewPermissions — 順序", () => {
  let viewA: ViewPermission;
  let viewB: ViewPermission;
  let viewC: ViewPermission;

  beforeEach(() => {
    viewA = buildViewPermissionInCluster("prod-cluster", "api-service");
    viewB = buildViewPermissionInCluster("prod-cluster", "web-service");
    viewC = buildViewPermissionInCluster("staging-cluster", "api-service");
  });

  it("追加前の既存サービスの順序が維持されること", () => {
    const result = addViewPermissions([viewA, viewB], [viewC]);

    expect(result[0].serviceArn).toBe(viewA.serviceArn);
    expect(result[1].serviceArn).toBe(viewB.serviceArn);
  });

  it("新しいサービスは既存サービスの後に追加されること", () => {
    const result = addViewPermissions([viewA, viewB], [viewC]);

    expect(result[result.length - 1].serviceArn).toBe(viewC.serviceArn);
  });
});

// ──────────────────────────────────────────────────────────────────
// removeViewPermissions
// チェックされたサービスを閲覧権限一覧から削除する。
// ──────────────────────────────────────────────────────────────────

describe("removeViewPermissions — 基本削除", () => {
  let viewA: ViewPermission;
  let viewB: ViewPermission;
  let viewC: ViewPermission;

  beforeEach(() => {
    viewA = buildViewPermissionInCluster("prod-cluster", "api-service");
    viewB = buildViewPermissionInCluster("prod-cluster", "web-service");
    viewC = buildViewPermissionInCluster("staging-cluster", "api-service");
  });

  it("指定したサービスが一覧から削除されること", () => {
    const result = removeViewPermissions([viewA, viewB, viewC], [viewB]);

    expect(result).toHaveLength(2);
    expect(result.map((p) => p.serviceArn)).not.toContain(viewB.serviceArn);
  });

  it("複数のサービスを一度に削除できること", () => {
    const result = removeViewPermissions([viewA, viewB, viewC], [viewA, viewC]);

    expect(result).toHaveLength(1);
    expect(result[0].serviceArn).toBe(viewB.serviceArn);
  });

  it("削除後も残るべきサービスはすべて変化しないこと", () => {
    const result = removeViewPermissions([viewA, viewB, viewC], [viewB]);

    expect(result.map((p) => p.serviceArn)).toContain(viewA.serviceArn);
    expect(result.map((p) => p.serviceArn)).toContain(viewC.serviceArn);
  });
});

describe("removeViewPermissions — 境界条件", () => {
  let viewA: ViewPermission;
  let viewB: ViewPermission;
  let viewD: ViewPermission;

  beforeEach(() => {
    viewA = buildViewPermissionInCluster("prod-cluster", "api-service");
    viewB = buildViewPermissionInCluster("prod-cluster", "web-service");
    viewD = buildViewPermissionInCluster("staging-cluster", "batch-service"); // 一覧に存在しない
  });

  it("存在しないサービスを削除しようとしても一覧が変化しないこと", () => {
    const result = removeViewPermissions([viewA, viewB], [viewD]);

    expect(result).toHaveLength(2);
    expect(result.map((p) => p.serviceArn)).toEqual([viewA.serviceArn, viewB.serviceArn]);
  });

  it("空の一覧から削除しようとしても空のまま返ること", () => {
    const result = removeViewPermissions([], [viewA]);

    expect(result).toHaveLength(0);
  });

  it("空の削除リストを渡しても一覧が変化しないこと", () => {
    const result = removeViewPermissions([viewA, viewB], []);

    expect(result).toHaveLength(2);
    expect(result.map((p) => p.serviceArn)).toEqual([viewA.serviceArn, viewB.serviceArn]);
  });

  it("一覧にある全サービスを削除すると空配列が返ること", () => {
    const result = removeViewPermissions([viewA, viewB], [viewA, viewB]);

    expect(result).toHaveLength(0);
  });
});
