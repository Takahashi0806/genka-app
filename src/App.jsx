import React, { useEffect, useMemo, useState } from "react";

const GAS_URL = "https://script.google.com/macros/s/AKfycbx6Kvcbk5h_qQ1n-7yxw_UEUJltOGKtiMxwJH1kAfxharYcdV0GPi0W1oLZFCu_GOZA1Q/exec";

const APP_VERSION = "v3.3.1";
const STORAGE_KEY = "genka-app-state-v3.1.5";
const SYNC_QUEUE_KEY = "genka-sync-queue-v3.1.5";
const DEVICE_ID_KEY = "genka-device-id-v3.1.5";

const OVERHEAD = 1.35;
const ADMIN_PIN = "1234";

const defaultWorkers = [
  { id: "W001", name: "中畑", hourly_rate: 2300 },
  { id: "W002", name: "伴", hourly_rate: 2300 },
  { id: "W003", name: "谷上", hourly_rate: 2300 },
  { id: "W004", name: "藤島", hourly_rate: 2000 },
  { id: "W005", name: "堀江", hourly_rate: 2300 },
  { id: "W006", name: "佐藤幸三", hourly_rate: 2300 },
];

const defaultManagers = [
  { id: "M001", name: "工藤" },
  { id: "M002", name: "片野" },
  { id: "M003", name: "髙橋" },
  { id: "M004", name: "山野寺" },
  { id: "M005", name: "金子" },
  { id: "M006", name: "こうだい" },
  { id: "M007", name: "マナト" },
];

const defaultMaterials = [
  { id: "MAT001", name: "ラワンランバー", thickness: "12t", size: "3×6", full_name: "ラワンランバー 12t 3×6", unit_price: 2040 },
  { id: "MAT002", name: "ラワンランバー", thickness: "15t", size: "3×6", full_name: "ラワンランバー 15t 3×6", unit_price: 2600 },
  { id: "MAT003", name: "ラワンランバー", thickness: "18t", size: "3×6", full_name: "ラワンランバー 18t 3×6", unit_price: 3200 },
];

const today = () => new Date().toISOString().slice(0, 10);
const currentMonth = () => new Date().toISOString().slice(0, 7);
const currentYear = () => String(new Date().getFullYear());
const nowIso = () => new Date().toISOString();
const yen = (n) => `${Math.round(Number(n || 0)).toLocaleString()}円`;

const formatDateTime = (value) => {
  if (!value) return "";
  const s = String(value);
  if (s.length === 10 && s[4] === "-" && s[7] === "-") return s.replaceAll("-", "/");
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s.slice(0, 10).replaceAll("-", "/");
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}/${m}/${day} ${hh}:${mm}`;
};

const isGasReady = () => GAS_URL && !GAS_URL.includes("ここにGAS");

const getDeviceId = () => {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = `device_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
};

const makeRecordId = (type) => `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
const makeSiteId = () => `site_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const safeJsonParse = (text, fallback) => {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
};

const loadQueue = () => safeJsonParse(localStorage.getItem(SYNC_QUEUE_KEY) || "[]", []);
const saveQueue = (queue) => localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));

const normalizeRecord = (record) => ({
  record_id: String(record.record_id || makeRecordId(record.entity_type || "record")),
  entity_type: String(record.entity_type || ""),
  site_id: String(record.site_id || ""),
  site_name: String(record.site_name || ""),
  manager: String(record.manager || ""),
  creator: String(record.creator || ""),
  work_date: String(record.work_date || ""),
  material_date: String(record.material_date || ""),
  hours: record.hours === undefined || record.hours === null ? "" : String(record.hours),
  material_id: String(record.material_id || ""),
  material_name: String(record.material_name || ""),
  material_thickness: String(record.material_thickness || ""),
  material_size: String(record.material_size || ""),
  qty: record.qty === undefined || record.qty === null ? "" : String(record.qty),
  unit_price: record.unit_price === undefined || record.unit_price === null ? "" : String(record.unit_price),
  status: String(record.status || "active"),
  created_at: String(record.created_at || nowIso()),
  updated_at: String(record.updated_at || nowIso()),
  device_id: String(record.device_id || getDeviceId()),
  updated_by: String(record.updated_by || ""),
});

const mergeRecords = (base, incoming) => {
  const map = new Map();
  [...base, ...incoming].forEach((r) => {
    const record = normalizeRecord(r);
    const old = map.get(record.record_id);
    if (!old || String(record.updated_at) >= String(old.updated_at)) {
      map.set(record.record_id, record);
    }
  });
  return Array.from(map.values()).sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
};

const active = (r) => r.status !== "deleted";

const App = () => {
  const [screen, setScreen] = useState("site");
  const [records, setRecords] = useState([]);
  const [workers, setWorkers] = useState(defaultWorkers);
  const [managers, setManagers] = useState(defaultManagers);
  const [materialMasters, setMaterialMasters] = useState(defaultMaterials);
  const [adjustments, setAdjustments] = useState([]);

  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [commonCreator, setCommonCreator] = useState(defaultWorkers[0].name);

  const [siteName, setSiteName] = useState("");
  const [sitePerson, setSitePerson] = useState(defaultManagers[0].name);
  const [editingSiteRecordId, setEditingSiteRecordId] = useState(null);

  const [newCreatorName, setNewCreatorName] = useState(defaultWorkers[0].name);

  const [workDate, setWorkDate] = useState(today());
  const [workHours, setWorkHours] = useState("");
  const [editingWorkRecordId, setEditingWorkRecordId] = useState(null);

  const [materialDate, setMaterialDate] = useState(today());
  const [materialName, setMaterialName] = useState(defaultMaterials[0].name);
  const [materialThickness, setMaterialThickness] = useState(defaultMaterials[0].thickness);
  const [materialSize, setMaterialSize] = useState(defaultMaterials[0].size);
  const [materialQty, setMaterialQty] = useState("");
  const [editingMaterialRecordId, setEditingMaterialRecordId] = useState(null);

  const [invoiceViewMode, setInvoiceViewMode] = useState("month");
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());
  const [selectedYear, setSelectedYear] = useState(currentYear());
  const [isAdmin, setIsAdmin] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [notice, setNotice] = useState("");
  const [syncStatus, setSyncStatus] = useState("未同期");

  const managerNames = useMemo(() => managers.filter((m) => m.is_active !== false && String(m.is_active).toLowerCase() !== "false").map((m) => m.name), [managers]);
  const workerNames = useMemo(() => workers.filter((w) => w.is_active !== false && String(w.is_active).toLowerCase() !== "false").map((w) => w.name), [workers]);

  const notify = (msg) => {
    // 登録・追加・更新・削除のたびに確認表示を出さない
    const silentMessages = ["登録しました", "追加しました", "更新しました", "削除しました", "CSVを出力しました", "管理者モードになりました"];
    if (silentMessages.some((word) => String(msg).includes(word))) return;

    setNotice(msg);
    window.clearTimeout(window.__genkaNotifyTimer);
    window.__genkaNotifyTimer = window.setTimeout(() => setNotice(""), 2500);
  };

  const persistLocal = (nextRecords, nextMasters, extra = {}) => {
    const snapshot = {
      records: nextRecords,
      workers: nextMasters?.workers || workers,
      managers: nextMasters?.managers || managers,
      materialMasters: nextMasters?.materialMasters || materialMasters,
      adjustments,
      selectedSiteId,
      commonCreator,
      ...extra,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  };

  const setAndPersistRecords = (updater, extra = {}) => {
    setRecords((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      persistLocal(next, null, extra);
      return next;
    });
  };

  const pushRecords = async (sendRecords) => {
    if (!sendRecords.length) return true;
    if (!isGasReady()) return false;

    try {
      setSyncStatus("同期中");
      const res = await fetch(GAS_URL, {
        method: "POST",
        body: JSON.stringify({ action: "bulkUpsert", records: sendRecords.map(normalizeRecord) }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "GAS保存エラー");
      setSyncStatus("同期済み");
      return true;
    } catch (err) {
      console.error(err);
      setSyncStatus("未送信あり");
      return false;
    }
  };

  const enqueueRecords = async (sendRecords) => {
    const normalized = sendRecords.map(normalizeRecord);
    const queue = mergeRecords(loadQueue(), normalized);
    saveQueue(queue);

    const ok = await pushRecords(queue);
    if (ok) saveQueue([]);
    return ok;
  };

  const flushQueue = async () => {
    const queue = loadQueue();
    if (!queue.length) return true;
    const ok = await pushRecords(queue);
    if (ok) saveQueue([]);
    return ok;
  };

  const fetchBootstrap = async () => {
    if (!isGasReady()) return;

    try {
      setSyncStatus("読込中");
      const res = await fetch(`${GAS_URL}?action=bootstrap&ts=${Date.now()}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "GAS読込エラー");

      const nextWorkers = json.masters?.workers?.length ? json.masters.workers : defaultWorkers;
      const nextManagers = json.masters?.managers?.length ? json.masters.managers : defaultManagers;
      const nextMaterials = json.masters?.materials?.length ? json.masters.materials : defaultMaterials;

      setWorkers(nextWorkers);
      setManagers(nextManagers);
      setMaterialMasters(nextMaterials);
      setAdjustments(json.adjustments || []);

      // 重要：ここで records 変数を直接使わない。
      // 起動直後は records が空のまま同期が走るため、ローカルで登録した現場が消える原因になる。
      setRecords((prev) => {
        const localSaved = safeJsonParse(localStorage.getItem(STORAGE_KEY) || "{}", {});
        const localRecords = Array.isArray(localSaved.records) ? localSaved.records : [];

        // 重要：prev + localStorage + GAS を必ず全部マージする。
        // これで、GAS読込が空でも登録直後の現場が消えない。
        const nextRecords = mergeRecords([...localRecords, ...prev], json.records || []);

        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            records: nextRecords,
            workers: nextWorkers,
            managers: nextManagers,
            materialMasters: nextMaterials,
            adjustments: json.adjustments || [],
            selectedSiteId,
            commonCreator,
          })
        );
        return nextRecords;
      });

      await flushQueue();
      setSyncStatus("同期済み");
    } catch (err) {
      console.error(err);
      setSyncStatus("読込失敗");
    }
  };

  useEffect(() => {
    const saved = safeJsonParse(localStorage.getItem(STORAGE_KEY) || "{}", {});
    if (saved.records) setRecords(saved.records.map(normalizeRecord));
    if (saved.workers) setWorkers(saved.workers);
    if (saved.managers) setManagers(saved.managers);
    if (saved.materialMasters) setMaterialMasters(saved.materialMasters);
    if (saved.adjustments) setAdjustments(saved.adjustments);
    if (saved.selectedSiteId) setSelectedSiteId(saved.selectedSiteId);
    if (saved.commonCreator) setCommonCreator(saved.commonCreator);
  }, []);

  useEffect(() => {
    fetchBootstrap();
    const timer = setInterval(() => {
      fetchBootstrap();
    }, 30000);
    const onFocus = () => fetchBootstrap();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const siteRecords = useMemo(
  () => records.filter((r) => r.entity_type === "site" && r.status !== "deleted"),
  [records]
);

  const creatorRecords = useMemo(() => records.filter((r) => r.entity_type === "site_creator" && active(r)), [records]);
  const workRecords = useMemo(() => records.filter((r) => r.entity_type === "work" && active(r)), [records]);
  const materialRecords = useMemo(() => records.filter((r) => r.entity_type === "material" && active(r)), [records]);

  const sites = useMemo(() => {
    const map = new Map();
    siteRecords.forEach((r) => {
      map.set(r.site_id, {
        id: r.site_id,
        recordId: r.record_id,
        name: r.site_name,
        person: r.manager,
        createdAt: r.created_at?.slice(0, 10) || "",
      });
    });
    return Array.from(map.values()).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }, [siteRecords]);
const visibleSites = useMemo(
  () => sites.filter((s) => {
    const siteRecord = records.find((r) => r.record_id === s.recordId);
    return siteRecord?.status !== "closed";
  }),
  [sites, records]
);
  const selectedSite = useMemo(() => sites.find((s) => s.id === selectedSiteId) || null, [sites, selectedSiteId]);

  const siteCreatorsMap = useMemo(() => {
    const map = {};
    creatorRecords.forEach((r) => {
      if (!map[r.site_id]) map[r.site_id] = [];
      if (r.creator && !map[r.site_id].includes(r.creator)) map[r.site_id].push(r.creator);
    });
    return map;
  }, [creatorRecords]);

  const selectedCreators = selectedSite ? siteCreatorsMap[selectedSite.id] || [] : [];

  const upsertLocalAndRemote = (record) => {
    const normalized = normalizeRecord(record);
    setAndPersistRecords((prev) => mergeRecords(prev, [normalized]));
    enqueueRecords([normalized]);
  };

  const getHourlyRate = (creator) => {
    const w = workers.find((x) => x.name === creator);
    return Number(w?.hourly_rate || (creator === "藤島" ? 2000 : 2300));
  };

  const selectedMaterialMaster = useMemo(() => {
    return materialMasters.find(
      (m) => m.name === materialName && String(m.thickness || "") === String(materialThickness || "") && String(m.size || "") === String(materialSize || "")
    ) || materialMasters.find((m) => m.name === materialName) || materialMasters[0];
  }, [materialMasters, materialName, materialThickness, materialSize]);

  const materialNames = useMemo(() => Array.from(new Set(materialMasters.map((m) => m.name))).filter(Boolean), [materialMasters]);
  const materialThicknesses = useMemo(() => Array.from(new Set(materialMasters.filter((m) => m.name === materialName).map((m) => m.thickness))).filter(Boolean), [materialMasters, materialName]);
  const materialSizes = useMemo(() => Array.from(new Set(materialMasters.filter((m) => m.name === materialName && (!materialThickness || m.thickness === materialThickness)).map((m) => m.size))).filter(Boolean), [materialMasters, materialName, materialThickness]);

  const goPrev = () => {
    if (screen === "creator") setScreen("site");
    if (screen === "work") setScreen("creator");
    if (screen === "invoice") setScreen("work");
  };

  const goNext = () => {
    if (screen === "site") setScreen("creator");
    if (screen === "creator") setScreen("work");
    if (screen === "work") setScreen("invoice");
  };

  const saveSite = () => {
    if (!siteName.trim()) return notify("現場名を入力してください");
    const existing = editingSiteRecordId ? records.find((r) => r.record_id === editingSiteRecordId) : null;
    const siteId = existing?.site_id || makeSiteId();
    const record = {
      record_id: existing?.record_id || makeRecordId("site"),
      entity_type: "site",
      site_id: siteId,
      site_name: siteName.trim(),
      manager: sitePerson,
      status: "active",
      created_at: existing?.created_at || nowIso(),
      updated_at: nowIso(),
      device_id: getDeviceId(),
      updated_by: commonCreator,
    };
    upsertLocalAndRemote(record);
    setSelectedSiteId(siteId);
    persistLocal(mergeRecords(records, [record]), null, { selectedSiteId: siteId });
    setEditingSiteRecordId(null);
    setSiteName("");
    setSitePerson(managerNames[0] || "");
    notify(existing ? "現場を更新しました" : "現場を登録しました");
  };

  const editSite = (site) => {
    setEditingSiteRecordId(site.recordId);
    setSiteName(site.name);
    setSitePerson(site.person);
    setScreen("site");
  };

  const openSite = (site) => {
    setSelectedSiteId(site.id);
    persistLocal(records, null, { selectedSiteId: site.id });
    setScreen("creator");
  };

  const deleteSite = (site) => {
    if (!window.confirm(`現場「${site.name}」を削除しますか？`)) return;
    const targetRecords = records.filter((r) => r.site_id === site.id && active(r));
    const deleted = targetRecords.map((r) => normalizeRecord({ ...r, status: "deleted", updated_at: nowIso(), device_id: getDeviceId(), updated_by: commonCreator }));
    setAndPersistRecords((prev) => mergeRecords(prev, deleted));
    enqueueRecords(deleted);
    if (selectedSiteId === site.id) setSelectedSiteId("");
    notify("現場を削除しました");
  };
const closeSite = (site) => {
  if (!window.confirm(`現場「${site.name}」を完了にして一覧から非表示にしますか？`)) return;

  const target = records.find((r) => r.record_id === site.recordId);
  if (!target) return;

  const closed = normalizeRecord({
    ...target,
    status: "closed",
    updated_at: nowIso(),
    device_id: getDeviceId(),
    updated_by: commonCreator,
  });

  setAndPersistRecords((prev) => mergeRecords(prev, [closed]));
  enqueueRecords([closed]);

  if (selectedSiteId === site.id) setSelectedSiteId("");
};  const addCreator = () => {
    if (!selectedSite) return notify("先に現場を選んでください");
    if (!newCreatorName) return notify("制作者を選んでください");
    if (selectedCreators.includes(newCreatorName)) return notify("この制作者は登録済みです");

    const record = {
      record_id: makeRecordId("site_creator"),
      entity_type: "site_creator",
      site_id: selectedSite.id,
      site_name: selectedSite.name,
      manager: selectedSite.person,
      creator: newCreatorName,
      status: "active",
      created_at: nowIso(),
      updated_at: nowIso(),
      device_id: getDeviceId(),
      updated_by: newCreatorName,
    };
    upsertLocalAndRemote(record);
    setCommonCreator(newCreatorName);
    notify("制作者を登録しました");
  };

  const deleteCreator = (creator) => {
    if (!selectedSite) return;
    if (!window.confirm(`${creator} をこの現場から削除しますか？`)) return;
    const targetRecords = records.filter((r) => r.site_id === selectedSite.id && r.creator === creator && r.entity_type === "site_creator" && active(r));
    const deleted = targetRecords.map((r) => normalizeRecord({ ...r, status: "deleted", updated_at: nowIso(), device_id: getDeviceId(), updated_by: commonCreator }));
    setAndPersistRecords((prev) => mergeRecords(prev, deleted));
    enqueueRecords(deleted);
    notify("制作者を削除しました");
  };

  const selectCreator = (creator) => {
    setCommonCreator(creator);
    persistLocal(records, null, { commonCreator: creator });
    setScreen("work");
  };

  const saveWork = () => {
    if (!selectedSite) return notify("先に現場を選んでください");
    if (!commonCreator) return notify("制作者を選んでください");
    if (!workHours) return notify("作業時間を入力してください");

    const existing = editingWorkRecordId ? records.find((r) => r.record_id === editingWorkRecordId) : null;
    const record = {
      record_id: existing?.record_id || makeRecordId("work"),
      entity_type: "work",
      site_id: selectedSite.id,
      site_name: selectedSite.name,
      manager: selectedSite.person,
      creator: commonCreator,
      work_date: workDate,
      hours: workHours,
      status: "active",
      created_at: existing?.created_at || nowIso(),
      updated_at: nowIso(),
      device_id: getDeviceId(),
      updated_by: commonCreator,
    };
    upsertLocalAndRemote(record);
    setEditingWorkRecordId(null);
    setWorkHours("");
    setWorkDate(today());
    notify(existing ? "作業を更新しました" : "作業を追加しました");
  };

  const editWork = (record) => {
    setEditingWorkRecordId(record.record_id);
    setWorkDate(record.work_date || today());
    setWorkHours(record.hours || "");
    setCommonCreator(record.creator || commonCreator);
  };

  const deleteWork = (record) => {
    const deleted = normalizeRecord({ ...record, status: "deleted", updated_at: nowIso(), device_id: getDeviceId(), updated_by: commonCreator });
    setAndPersistRecords((prev) => mergeRecords(prev, [deleted]));
    enqueueRecords([deleted]);
    notify("作業を削除しました");
  };

  const saveMaterial = () => {
    if (!selectedSite) return notify("先に現場を選んでください");
    if (!commonCreator) return notify("制作者を選んでください");
    if (!materialQty) return notify("材料枚数を入力してください");

    const master = selectedMaterialMaster || {};
    const existing = editingMaterialRecordId ? records.find((r) => r.record_id === editingMaterialRecordId) : null;
    const record = {
      record_id: existing?.record_id || makeRecordId("material"),
      entity_type: "material",
      site_id: selectedSite.id,
      site_name: selectedSite.name,
      manager: selectedSite.person,
      creator: commonCreator,
      material_date: materialDate,
      material_id: master.id || "",
      material_name: materialName,
      material_thickness: materialThickness,
      material_size: materialSize,
      qty: materialQty,
      unit_price: master.unit_price || "",
      status: "active",
      created_at: existing?.created_at || nowIso(),
      updated_at: nowIso(),
      device_id: getDeviceId(),
      updated_by: commonCreator,
    };
    upsertLocalAndRemote(record);
    setEditingMaterialRecordId(null);
    setMaterialQty("");
    setMaterialDate(today());
    notify(existing ? "材料を更新しました" : "材料を追加しました");
  };

  const editMaterial = (record) => {
    setEditingMaterialRecordId(record.record_id);
    setMaterialDate(record.material_date || today());
    setCommonCreator(record.creator || commonCreator);
    setMaterialName(record.material_name || materialNames[0] || "");
    setMaterialThickness(record.material_thickness || "");
    setMaterialSize(record.material_size || "");
    setMaterialQty(record.qty || "");
  };

  const deleteMaterial = (record) => {
    const deleted = normalizeRecord({ ...record, status: "deleted", updated_at: nowIso(), device_id: getDeviceId(), updated_by: commonCreator });
    setAndPersistRecords((prev) => mergeRecords(prev, [deleted]));
    enqueueRecords([deleted]);
    notify("材料を削除しました");
  };

  useEffect(() => {
    if (!materialNames.includes(materialName) && materialNames[0]) setMaterialName(materialNames[0]);
  }, [materialNames, materialName]);

  useEffect(() => {
    if (!materialThicknesses.includes(materialThickness) && materialThicknesses[0]) setMaterialThickness(materialThicknesses[0]);
  }, [materialThicknesses, materialThickness]);

  useEffect(() => {
    if (!materialSizes.includes(materialSize) && materialSizes[0]) setMaterialSize(materialSizes[0]);
  }, [materialSizes, materialSize]);

  const selectedWorks = useMemo(() => {
    if (!selectedSite) return [];
    return workRecords.filter((r) => r.site_id === selectedSite.id && r.creator === commonCreator).sort((a, b) => String(b.work_date).localeCompare(String(a.work_date)));
  }, [workRecords, selectedSite, commonCreator]);

  const selectedMaterials = useMemo(() => {
    if (!selectedSite) return [];
    return materialRecords.filter((r) => r.site_id === selectedSite.id && r.creator === commonCreator).sort((a, b) => String(b.material_date).localeCompare(String(a.material_date)));
  }, [materialRecords, selectedSite, commonCreator]);

  const getAdjustment = (periodKey, siteId, creator) => {
    const row = adjustments.find((a) => String(a.target_month || a.period_key || "") === String(periodKey) && String(a.site_id) === String(siteId) && String(a.creator || "") === String(creator || ""));
    return Number(row?.adjustment_amount || 0);
  };

  const invoiceRows = useMemo(() => {
    const periodKey = invoiceViewMode === "month" ? selectedMonth : selectedYear;
    const rows = [];
    sites.forEach((site) => {
      const creators = siteCreatorsMap[site.id] || [];
      creators.forEach((creator) => {
        const works = workRecords.filter((r) => {
          const d = r.work_date || "";
          const match = invoiceViewMode === "month" ? d.slice(0, 7) === selectedMonth : d.slice(0, 4) === selectedYear;
          return r.site_id === site.id && r.creator === creator && match;
        });
        const mats = materialRecords.filter((r) => {
          const d = r.material_date || "";
          const match = invoiceViewMode === "month" ? d.slice(0, 7) === selectedMonth : d.slice(0, 4) === selectedYear;
          return r.site_id === site.id && r.creator === creator && match;
        });
        const workHoursTotal = works.reduce((s, r) => s + Number(r.hours || 0), 0);
        const workAmount = workHoursTotal * getHourlyRate(creator) * OVERHEAD;
        const materialQtyTotal = mats.reduce((s, r) => s + Number(r.qty || 0), 0);
        const materialAmount = mats.reduce((s, r) => s + Number(r.qty || 0) * Number(r.unit_price || 0) * OVERHEAD, 0);
        const adjustment = getAdjustment(periodKey, site.id, creator);
        if (works.length || mats.length || adjustment) {
          rows.push({
            siteId: site.id,
            siteName: site.name,
            manager: site.person,
            creator,
            workCount: works.length,
            workHoursTotal,
            materialCount: mats.length,
            materialQtyTotal,
            workAmount,
            materialAmount,
            total: workAmount + materialAmount,
          });
        }
      });
    });
    return rows;
  }, [sites, siteCreatorsMap, workRecords, materialRecords, invoiceViewMode, selectedMonth, selectedYear, workers, adjustments]);

  const invoiceTotal = invoiceRows.reduce((s, r) => s + r.total, 0);
  const workTotal = invoiceRows.reduce((s, r) => s + r.workAmount, 0);
  const materialTotal = invoiceRows.reduce((s, r) => s + r.materialAmount, 0);
  const adjustmentTotal = invoiceRows.reduce((s, r) => s + r.adjustment, 0);

  const exportInvoiceCsv = () => {
    const periodLabel = invoiceViewMode === "month" ? selectedMonth : selectedYear;
    const header = ["集計区分", "対象期間", "現場名", "担当者", "制作者", "作業時間", "作業件数", "材料枚数", "材料件数", "作業請求", "材料請求",  "請求金額"];
    const body = invoiceRows.map((r) => [
      invoiceViewMode === "month" ? "月次" : "年次",
      periodLabel,
      r.siteName,
      r.manager,
      r.creator,
      r.workHoursTotal.toFixed(1),
      r.workCount,
      r.materialQtyTotal.toFixed(1),
      r.materialCount,
      Math.round(r.workAmount),
      Math.round(r.materialAmount),
      Math.round(r.adjustment),
      Math.round(r.total),
    ]);
    const csv = [header, ...body].map((line) => line.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `請求集計_${periodLabel}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notify("CSVを出力しました");
  };

  const loginAdmin = () => {
    if (pinInput === ADMIN_PIN) {
      setIsAdmin(true);
      setPinInput("");
      notify("管理者モードになりました");
    } else {
      notify("PINが違います");
    }
  };

  const siteStats = (siteId) => ({
    workCount: workRecords.filter((r) => r.site_id === siteId).length,
    materialCount: materialRecords.filter((r) => r.site_id === siteId).length,
  });

  const creatorStats = (siteId, creator) => {
    const works = workRecords.filter((r) => r.site_id === siteId && r.creator === creator);
    const mats = materialRecords.filter((r) => r.site_id === siteId && r.creator === creator);
    return {
      hours: works.reduce((s, r) => s + Number(r.hours || 0), 0),
      workCount: works.length,
      qty: mats.reduce((s, r) => s + Number(r.qty || 0), 0),
      materialCount: mats.length,
    };
  };

  return (
    <div
  className="app"
  style={{ paddingTop: "calc(env(safe-area-inset-top) + 10px)" }}
>
      <style>{styles}</style>

      <header className="topbar">
        <button className="arrow" onClick={goPrev} disabled={screen === "site"}>←</button>
        <div className="titleBox">
          <div className="appTitle">現場原価管理 <span className="versionBadge">{APP_VERSION}</span></div>
          <div className="subTitle">{syncStatus} / 未送信 {loadQueue().length}件</div>
        </div>
        <button className="arrow" onClick={goNext} disabled={screen === "invoice"}>→</button>
      </header>

      {notice && <div className="notice">{notice}</div>}

      <nav className="tabs">
        <button className={screen === "site" ? "active" : ""} onClick={() => setScreen("site")}>現場</button>
        <button className={screen === "creator" ? "active" : ""} onClick={() => setScreen("creator")}>制作者</button>
        <button className={screen === "work" ? "active" : ""} onClick={() => setScreen("work")}>作業材料</button>
        <button className={screen === "invoice" ? "active" : ""} onClick={() => setScreen("invoice")}>請求</button>
      </nav>

      {screen === "site" && (
        <main className="panel">
          <h2>現場登録</h2>
          <div className="formGrid two">
            <label>現場名<input value={siteName} onChange={(e) => setSiteName(e.target.value)} placeholder="現場名" /></label>
            <label>担当者<select value={sitePerson} onChange={(e) => setSitePerson(e.target.value)}>{managerNames.map((m) => <option key={m}>{m}</option>)}</select></label>
          </div>
          <button className="primary" onClick={saveSite}>{editingSiteRecordId ? "現場更新" : "現場登録"}</button>

          <h3>登録済み現場</h3>
          <div className="list">
            {visibleSites.map((site) => {
              const st = siteStats(site.id);
              return (
                <div className="card siteCard" key={site.id}>
                  <div className="cardMain" onClick={() => openSite(site)}>
                    <b>{site.name}</b>
                    <span>担当:{site.person} / 作業{st.workCount}件 / 材料{st.materialCount}件 / {site.createdAt}</span>
                  </div>
                  <div className="cardActions">
                    <button onClick={() => editSite(site)}>編集</button>
                    <button onClick={() => openSite(site)}>開く</button>
                    <button onClick={() => closeSite(site)}>完了</button>
                    <button className="danger" onClick={() => deleteSite(site)}>削除</button>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      )}

      {screen === "creator" && (
        <main className="panel">
          <h2>制作者選択</h2>
          <div className="selectedInfo">現場：{selectedSite ? `${selectedSite.name} / ${selectedSite.person}` : "未選択"}</div>
          <div className="formGrid two">
            <label>制作者<select value={newCreatorName} onChange={(e) => setNewCreatorName(e.target.value)}>{workerNames.map((w) => <option key={w}>{w}</option>)}</select></label>
            <button className="primary inlineBtn" onClick={addCreator}>制作者登録</button>
          </div>

          <h3>登録済み制作者</h3>
          <div className="list">
            {selectedCreators.map((creator) => {
              const st = creatorStats(selectedSite.id, creator);
              return (
                <div className="card creatorCard" key={creator}>
                  <div className="cardMain" onClick={() => selectCreator(creator)}>
                    <b>{creator}</b>
                    <span>作業{st.hours}h/{st.workCount}件・材料{st.qty}枚/{st.materialCount}件</span>
                  </div>
                  <div className="cardActions">
                    <button onClick={() => selectCreator(creator)}>開く</button>
                    <button className="danger" onClick={() => deleteCreator(creator)}>削除</button>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      )}

      {screen === "work" && (
        <main className="panel">
          <h2>作業・材料登録</h2>
          <div className="selectedInfo">{selectedSite ? `${selectedSite.name} / 担当:${selectedSite.person} / 制作者:${commonCreator}` : "現場未選択"}</div>

          <div className="workLayout">
            <section className={editingWorkRecordId ? "box editing" : "box"}>
              <h3>作業追加</h3>
              <div className="formGrid two compact">
                <label>日付<input type="date" value={workDate} onChange={(e) => setWorkDate(e.target.value)} /></label>
                <label>時間<input type="number" inputMode="decimal" value={workHours} onChange={(e) => setWorkHours(e.target.value)} placeholder="8" /></label>
              </div>
              <button className="primary" onClick={saveWork}>{editingWorkRecordId ? "作業更新" : "作業追加"}</button>
            </section>

            <section className={editingMaterialRecordId ? "box editing" : "box"}>
              <h3>材料追加</h3>
              <div className="formGrid two compact">
                <label>日付<input type="date" value={materialDate} onChange={(e) => setMaterialDate(e.target.value)} /></label>
                <label>枚数<input type="number" inputMode="decimal" value={materialQty} onChange={(e) => setMaterialQty(e.target.value)} placeholder="1" /></label>
                </div>
              <div className="materialGrid">
                <label>材料<select value={materialName} onChange={(e) => setMaterialName(e.target.value)}>{materialNames.map((m) => <option key={m}>{m}</option>)}</select></label>
                <label>厚み<select value={materialThickness} onChange={(e) => setMaterialThickness(e.target.value)}>{materialThicknesses.map((m) => <option key={m}>{m}</option>)}</select></label>
                <label>サイズ<select value={materialSize} onChange={(e) => setMaterialSize(e.target.value)}>{materialSizes.map((m) => <option key={m}>{m}</option>)}</select></label>
              </div>
              <button className="primary" onClick={saveMaterial}>{editingMaterialRecordId ? "材料更新" : "材料追加"}</button>
            </section>
          </div>

          <div className="workLayout listLayout">
            <section className="box">
              <h3>作業一覧</h3>
              {selectedWorks.map((r) => (
                <div className="miniRow" key={r.record_id}>
                  <span>{formatDateTime(r.created_at || r.updated_at || r.work_date)}｜{r.hours}h</span>
                  <div><button onClick={() => editWork(r)}>編集</button><button className="danger" onClick={() => deleteWork(r)}>削除</button></div>
                </div>
              ))}
            </section>
            <section className="box">
              <h3>材料一覧</h3>
              {selectedMaterials.map((r) => (
                <div className="miniRow" key={r.record_id}>
                  <span>{formatDateTime(r.created_at || r.updated_at || r.material_date)}｜{r.material_name} {r.material_thickness} {r.material_size}｜{r.qty}枚</span>
                  <div><button onClick={() => editMaterial(r)}>編集</button><button className="danger" onClick={() => deleteMaterial(r)}>削除</button></div>
                </div>
              ))}
            </section>
          </div>
        </main>
      )}

      {screen === "invoice" && (
        <main className="panel">
          <h2>請求・集計</h2>
          <div className="formGrid four">
            <label>表示<select value={invoiceViewMode} onChange={(e) => setInvoiceViewMode(e.target.value)}><option value="month">月次</option><option value="year">年次</option></select></label>
            {invoiceViewMode === "month" ? <label>月<input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} /></label> : <label>年<input value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} /></label>}
            <label>PIN<input value={pinInput} onChange={(e) => setPinInput(e.target.value)} placeholder="1234" /></label>
            <button className="primary inlineBtn" onClick={loginAdmin}>{isAdmin ? "管理者中" : "管理者"}</button>
          </div>
          <div className="summaryGrid">
            <div><b>{yen(workTotal)}</b><span>作業請求</span></div>
            <div><b>{yen(materialTotal)}</b><span>材料請求</span></div>
            
            <div><b>{yen(invoiceTotal)}</b><span>請求合計</span></div>
          </div>
          <div className="actionsLine">
            <button onClick={exportInvoiceCsv}>CSV出力</button>
            <button onClick={() => window.print()}>印刷</button>
            <button onClick={() => setScreen("work")}>作業画面へ戻る</button>
          </div>
          <div className="tableWrap">
            <table>
              <thead><tr><th>現場名</th><th>担当</th><th>制作者</th><th>作業</th><th>材料</th><th>合計</th></tr></thead>
              <tbody>
                {invoiceRows.map((r) => (
                  <tr key={`${r.siteId}_${r.creator}`}>
                    <td>{r.siteName}</td><td>{r.manager}</td><td>{r.creator}</td><td>{yen(r.workAmount)}</td><td>{yen(r.materialAmount)}</td><td><b>{yen(r.total)}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      )}
    </div>
  );
};

const styles = `
*{box-sizing:border-box}body{margin:0;background:#f4f5f7;color:#1f2937;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.app{max-width:1180px;margin:0 auto;padding:8px;overflow-x:hidden}.topbar{display:flex;align-items:center;gap:8px;background:#111827;color:white;border-radius:14px;padding:8px 10px;position:sticky;top:0;z-index:2}.arrow{width:34px;height:34px;border-radius:10px;border:0;font-size:16px;background:#374151;color:white;flex-shrink:0}.arrow:disabled{opacity:.3}.titleBox{flex:1;text-align:center;min-width:0}.appTitle{font-weight:800;font-size:16px;display:flex;align-items:center;justify-content:center;gap:8px}.versionBadge{font-size:11px;background:#2563eb;color:#fff;border-radius:999px;padding:2px 8px;line-height:1.4}.subTitle{font-size:11px;color:#d1d5db}.tabs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px;margin:8px 0}.tabs button,.actionsLine button,.cardActions button,.miniRow button{border:0;border-radius:10px;background:white;padding:8px 6px;font-weight:700;font-size:12px;box-shadow:0 1px 3px #0001;white-space:nowrap}.tabs .active{background:#111827;color:white}.notice{background:#fef3c7;border:1px solid #f59e0b;border-radius:12px;padding:8px;margin:6px 0;font-size:13px}.panel{background:white;border-radius:16px;padding:10px;box-shadow:0 3px 14px #00000012;overflow:hidden}h2{font-size:17px;margin:4px 0 10px}h3{font-size:14px;margin:12px 0 6px}.formGrid{display:grid;gap:8px}.formGrid.two{
  grid-template-columns:minmax(0,1.28fr) minmax(0,.72fr);
  gap:10px;
}.formGrid.four{grid-template-columns:minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) auto}.formGrid.compact{gap:6px}.materialGrid{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,.85fr) minmax(0,.85fr);gap:6px;margin-top:6px}label{font-size:11px;font-weight:800;color:#4b5563;min-width:0}.formGrid > label,
.materialGrid > label{
  min-width:0;
  overflow:hidden;
}input,select{
  width:100%;
  min-width:0;
  max-width:100%;
  height:38px;
  border:1px solid #d1d5db;
  border-radius:10px;
  padding:6px 6px;
  font-size:14px;
  background:white;
  box-sizing:border-box;
}.primary{width:100%;height:40px;border:0;border-radius:12px;background:#111827;color:white;font-weight:800;margin-top:8px}.inlineBtn{height:38px;margin-top:15px}.selectedInfo{font-size:13px;font-weight:800;background:#eef2ff;border-radius:12px;padding:8px;margin-bottom:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.list{display:grid;gap:7px}.card{display:flex;align-items:center;gap:8px;justify-content:space-between;background:#f9fafb;border:1px solid #e5e7eb;border-radius:14px;padding:8px;min-width:0}.cardMain{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}.cardMain b{font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cardMain span{font-size:11px;color:#6b7280;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cardActions{display:flex;gap:4px;flex-shrink:0}.danger{background:#fee2e2!important;color:#991b1b!important}.workLayout{display:grid;grid-template-columns:minmax(0,1fr);gap:8px;margin-top:8px}.box{background:#f9fafb;border:1px solid #e5e7eb;border-radius:14px;padding:8px;min-width:0;overflow:hidden}.editing{border:2px solid #f59e0b;background:#fffbeb}.miniRow{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:8px;border-bottom:1px solid #e5e7eb;padding:6px 0;font-size:12px;min-width:0}.miniRow span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-variant-numeric:tabular-nums}.miniRow div{display:flex;gap:4px;flex-shrink:0}.summaryGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin:8px 0}.summaryGrid div{background:#f9fafb;border:1px solid #e5e7eb;border-radius:14px;padding:8px;text-align:center}.summaryGrid b{display:block;font-size:15px}.summaryGrid span{font-size:11px;color:#6b7280}.actionsLine{display:flex;gap:6px;margin:8px 0}.tableWrap{overflow:auto}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border-bottom:1px solid #e5e7eb;padding:7px;text-align:left;white-space:nowrap}th{background:#f3f4f6}@media(max-width:760px){.app{padding:6px}.formGrid.four{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}.card{padding:7px}.cardActions button{font-size:11px;padding:7px 5px}.summaryGrid{grid-template-columns:1fr 1fr}input,select{height:36px;font-size:13px}.panel{padding:8px}}@media(max-width:430px){.listLayout{grid-template-columns:1fr}.formGrid.four{grid-template-columns:1fr 1fr}.appTitle{font-size:15px}.tabs button{font-size:11px;padding:7px 3px}.miniRow{font-size:11px;gap:6px}.miniRow button{font-size:11px;padding:7px 5px}.materialGrid{grid-template-columns:minmax(0,1fr) minmax(0,.85fr) minmax(0,.85fr);gap:6px}}@media(max-width:430px){
  .formGrid.two.compact{
    grid-template-columns:minmax(0,1.35fr) minmax(0,.65fr);
    gap:6px;
  }

  .formGrid.two.compact input{
    font-size:13px;
    padding:5px 6px;
  }

  .materialGrid{
    grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr) minmax(0,.85fr);
    gap:5px;
  }

  .materialGrid select{
    font-size:13px;
    padding:5px 5px;
  }
}input[type="date"],
input[type="number"],
select {
  height: 36px !important;
  line-height: 36px !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  appearance: none;
  -webkit-appearance: none;
}
input[type="date"]{
  padding-right:4px !important;
}
@media print{.topbar,.tabs,.actionsLine,.notice{display:none}.app{max-width:none}.panel{box-shadow:none}.tableWrap{overflow:visible}}
`;

export default App;
