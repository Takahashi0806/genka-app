import React, { useEffect, useMemo, useRef, useState } from "react";

export default function App() {
  const GAS_URL =
    "https://script.google.com/macros/s/AKfycbx6Kvcbk5h_qQ1n-7yxw_UEUJltOGKtiMxwJH1kAfxharYcdV0GPi0W1oLZFCu_GOZA1Q/exec";

  const SYNC_QUEUE_KEY = "genka_sync_queue_v3";
  const DEVICE_ID_KEY = "genka_device_id_v1";

  const today = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const thisMonth = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  };

  const nowIso = () => new Date().toISOString();

  const monthOf = (v) => {
    if (!v) return "";
    const s = String(v).replace(/\//g, "-");
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 7);
    const d = new Date(v);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      return `${y}-${m}`;
    }
    return s.slice(0, 7);
  };

  const fmt = (n) => Number(n || 0).toLocaleString("ja-JP");

  const fmtDate = (v) => {
    if (!v) return "";
    const d = new Date(v);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}/${m}/${day}`;
    }
    return String(v).replace(/-/g, "/").slice(0, 10);
  };

  const makeId = (prefix) =>
    `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const getDeviceId = () => {
    const old = localStorage.getItem(DEVICE_ID_KEY);
    if (old) return old;
    const id = `device_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
    return id;
  };

  const deviceIdRef = useRef(getDeviceId());
  const syncingRef = useRef(false);

  const readQueue = () => {
    try {
      return JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || "[]");
    } catch {
      return [];
    }
  };

  const writeQueue = (rows) => {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(rows));
  };

  const mergeQueueRows = (prev, incoming) => {
    const map = new Map();
    [...prev, ...incoming].forEach((r) => {
      const key = String(r.record_id || "");
      if (!key) return;
      const old = map.get(key);
      if (!old || String(r.updated_at || "") >= String(old.updated_at || "")) {
        map.set(key, r);
      }
    });
    return Array.from(map.values());
  };

  const [materialMasters, setMaterialMasters] = useState([]);
  const [workerMasters, setWorkerMasters] = useState([]);
  const [managerMasters, setManagerMasters] = useState([]);

  const normalizeWorkerMaster = (x) => ({
    id: String(x?.id ?? ""),
    name: String(x?.name ?? ""),
    hourly_rate: Number(x?.hourly_rate ?? 0),
    is_active: String(x?.is_active ?? "true"),
  });

  const normalizeManagerMaster = (x) => ({
    id: String(x?.id ?? ""),
    name: String(x?.name ?? ""),
    is_active: String(x?.is_active ?? "true"),
  });

  const normalizeMaterialMaster = (x) => ({
    id: String(
      x?.id ??
        x?.material_id ??
        x?.["id"] ??
        x?.["material_id"] ??
        x?.["材料ID"] ??
        ""
    ),
    name: String(x?.name ?? x?.["name"] ?? x?.["材料名"] ?? ""),
    thickness: String(x?.thickness ?? x?.["thickness"] ?? x?.["厚み"] ?? ""),
    size: String(x?.size ?? x?.["size"] ?? x?.["サイズ"] ?? ""),
    full_name: String(
      x?.full_name ?? x?.["full_name"] ?? x?.["フル表示名"] ?? ""
    ),
    unit_price: Number(x?.unit_price ?? x?.["unit_price"] ?? x?.["単価"] ?? 0),
    is_active: String(x?.is_active ?? "true"),
  });

  const [screen, setScreen] = useState(() => {
    const navEntry = performance.getEntriesByType("navigation")[0];
    const isReload = navEntry?.type === "reload";
    if (isReload) {
      return sessionStorage.getItem("screen") || "site";
    }
    return "site";
  });

  useEffect(() => {
    sessionStorage.setItem("screen", screen);
  }, [screen]);

  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState("");

  const [message, setMessage] = useState("");
  const [syncing, setSyncing] = useState(false);

  const notify = (text) => {
    setMessage(text);
    window.clearTimeout(window.__genka_msg_timer__);
    window.__genka_msg_timer__ = window.setTimeout(() => setMessage(""), 2200);
  };

  const activeManagerMasters = useMemo(
    () =>
      managerMasters.filter(
        (x) =>
          String(x.is_active).toLowerCase() !== "false" &&
          String(x.is_active) !== "0"
      ),
    [managerMasters]
  );

  const activeWorkerMasters = useMemo(
    () =>
      workerMasters.filter(
        (x) =>
          String(x.is_active).toLowerCase() !== "false" &&
          String(x.is_active) !== "0"
      ),
    [workerMasters]
  );

  const activeMaterialMasters = useMemo(
    () =>
      materialMasters.filter(
        (x) =>
          String(x.is_active).toLowerCase() !== "false" &&
          String(x.is_active) !== "0"
      ),
    [materialMasters]
  );

  const [sites, setSites] = useState([]);
  const [siteCreatorsMap, setSiteCreatorsMap] = useState({});
  const [workLogs, setWorkLogs] = useState([]);
  const [materials, setMaterials] = useState([]);

  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [commonCreator, setCommonCreator] = useState("");

  const [siteName, setSiteName] = useState("");
  const [sitePerson, setSitePerson] = useState("");
  const [editingSiteId, setEditingSiteId] = useState("");

  const [newCreatorName, setNewCreatorName] = useState("");

  const [workDate, setWorkDate] = useState(today());
  const [workHours, setWorkHours] = useState("");
  const [editingWorkId, setEditingWorkId] = useState("");

  const [materialDate, setMaterialDate] = useState(today());
  const [materialName, setMaterialName] = useState("");
  const [materialThickness, setMaterialThickness] = useState("");
  const [materialSize, setMaterialSize] = useState("");
  const [materialQty, setMaterialQty] = useState("");
  const [editingMaterialId, setEditingMaterialId] = useState("");

  const [selectedMonth, setSelectedMonth] = useState(thisMonth());
  const [serverInvoiceRows, setServerInvoiceRows] = useState([]);
  const [serverInvoiceTotals, setServerInvoiceTotals] = useState({
    work_amount: 0,
    material_amount: 0,
    total_amount: 0,
  });

  const apiGet = async (params) => {
    const search = new URLSearchParams(params);
    const res = await fetch(`${GAS_URL}?${search.toString()}`, {
      method: "GET",
      cache: "no-store",
    });
    const text = await res.text();
    return JSON.parse(text);
  };

  const apiPost = async (body) => {
    const res = await fetch(GAS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    return JSON.parse(text);
  };

  const queueRecords = async (records) => {
    if (!Array.isArray(records) || !records.length) return;
    const prev = readQueue();
    const next = mergeQueueRows(prev, records);
    writeQueue(next);
    await flushQueue();
  };

  const fetchInvoiceSummary = async () => {
    try {
      setInvoiceLoading(true);
      setInvoiceError("");

      const json = await apiGet({
        action: "getInvoiceSummary",
        view: "month",
        month: selectedMonth || "",
      });

      if (!json?.ok) {
        throw new Error(json?.error || "請求データ取得に失敗しました");
      }

      setServerInvoiceRows(Array.isArray(json.rows) ? json.rows : []);
      setServerInvoiceTotals(
        json.totals || {
          work_amount: 0,
          material_amount: 0,
          total_amount: 0,
        }
      );
    } catch (e) {
      console.error("請求データ取得エラー", e);
      setInvoiceError(e?.message || "請求データ取得に失敗しました");
      setServerInvoiceRows([]);
      setServerInvoiceTotals({
        work_amount: 0,
        material_amount: 0,
        total_amount: 0,
      });
    } finally {
      setInvoiceLoading(false);
    }
  };

  const flushQueue = async () => {
    if (syncingRef.current) return;
    const queue = readQueue();
    if (!queue.length) return;

    syncingRef.current = true;
    setSyncing(true);
    try {
      const json = await apiPost({
        action: "bulkUpsert",
        records: queue,
      });

      if (!json?.ok) {
        throw new Error(json?.error || "同期に失敗しました");
      }

      writeQueue([]);
      await fetchInvoiceSummary();
    } catch (e) {
      console.error("同期エラー", e);
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  };

  const activeSites = useMemo(
    () => sites.filter((x) => x.status !== "deleted" && x.isActive !== false),
    [sites]
  );

  const toSiteGasRecord = (site) => ({
    record_id: String(site.recordId || site.record_id || site.id),
    entity_type: "site",
    site_id: String(site.id),
    site_name: site.name || "",
    manager: site.person || "",
    creator: "",
    work_date: "",
    material_date: "",
    hours: "",
    material_id: "",
    material_name: "",
    material_thickness: "",
    material_size: "",
    qty: "",
    unit_price: "",
    status: site.status || "active",
    created_at: site.createdAt || nowIso(),
    updated_at: site.updatedAt || nowIso(),
    device_id: deviceIdRef.current,
    updated_by: "app",
  });

  const toSiteCreatorGasRecord = ({
    siteId,
    siteName,
    manager,
    creator,
    status = "active",
    createdAt,
    updatedAt,
    recordId,
  }) => ({
    record_id: String(recordId || makeId("site_creator")),
    entity_type: "site_creator",
    site_id: String(siteId),
    site_name: siteName || "",
    manager: manager || "",
    creator: creator || "",
    work_date: "",
    material_date: "",
    hours: "",
    material_id: "",
    material_name: "",
    material_thickness: "",
    material_size: "",
    qty: "",
    unit_price: "",
    status,
    created_at: createdAt || nowIso(),
    updated_at: updatedAt || nowIso(),
    device_id: deviceIdRef.current,
    updated_by: creator || "app",
  });

  const toWorkGasRecord = (row, site) => ({
    record_id: row.id,
    entity_type: "work",
    site_id: row.siteId,
    site_name: site?.name || "",
    manager: site?.person || "",
    creator: row.creator,
    work_date: row.date,
    material_date: "",
    hours: row.hours,
    material_id: "",
    material_name: "",
    material_thickness: "",
    material_size: "",
    qty: "",
    unit_price: "",
    status: row.status,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    device_id: deviceIdRef.current,
    updated_by: row.creator || "app",
  });

  const toMaterialGasRecord = (row, site) => ({
    record_id: row.id,
    entity_type: "material",
    site_id: row.siteId,
    site_name: site?.name || "",
    manager: site?.person || "",
    creator: row.creator,
    work_date: "",
    material_date: row.date,
    hours: "",
    material_id: row.materialId || "",
    material_name: row.name || "",
    material_thickness: row.thickness || "",
    material_size: row.size || "",
    qty: row.qty,
    unit_price: row.unitPrice,
    status: row.status,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    device_id: deviceIdRef.current,
    updated_by: row.creator || "app",
  });

  useEffect(() => {
    const fetchBootstrap = async () => {
      try {
        const json = await apiGet({ action: "bootstrap" });

        const rawMaterials = Array.isArray(json?.materials)
          ? json.materials
          : Array.isArray(json?.masters?.materials)
          ? json.masters.materials
          : [];

        const rawWorkers = Array.isArray(json?.workers)
          ? json.workers
          : Array.isArray(json?.masters?.workers)
          ? json.masters.workers
          : [];

        const rawManagers = Array.isArray(json?.managers)
          ? json.managers
          : Array.isArray(json?.masters?.managers)
          ? json.masters.managers
          : [];

        const rawRecords = Array.isArray(json?.records) ? json.records : [];

        const normalizedMaterials = rawMaterials
          .map(normalizeMaterialMaster)
          .filter((x) => x.name);

        const normalizedWorkers = rawWorkers
          .map(normalizeWorkerMaster)
          .filter((x) => x.name);

        const normalizedManagers = rawManagers
          .map(normalizeManagerMaster)
          .filter((x) => x.name);

        setMaterialMasters(normalizedMaterials);
        setWorkerMasters(normalizedWorkers);
        setManagerMasters(normalizedManagers);

        if (normalizedManagers.length > 0) {
          setSitePerson(normalizedManagers[0].name);
        }

        const latestRecordMap = new Map();

        rawRecords.forEach((r) => {
          const recordId = String(r?.record_id || "");
          if (!recordId) return;

          const old = latestRecordMap.get(recordId);
          const oldTime = String(old?.updated_at || old?.created_at || "");
          const newTime = String(r?.updated_at || r?.created_at || "");

          if (!old || newTime >= oldTime) {
            latestRecordMap.set(recordId, r);
          }
        });

        const latestRecords = Array.from(latestRecordMap.values());

        const siteMap = new Map();
        const creatorMap = {};
        const restoredWorkLogs = [];
        const restoredMaterials = [];

        latestRecords.forEach((r) => {
          const entityType = String(r?.entity_type || "");
          const siteId = String(r?.site_id || "");
          const siteName = String(r?.site_name || "");
          const manager = String(r?.manager || "");
          const creator = String(r?.creator || "");

          if (
            entityType === "site" &&
            String(r?.status || "") !== "deleted" &&
            siteId &&
            !siteMap.has(siteId)
          ) {
            siteMap.set(siteId, {
              id: siteId,
              recordId: String(r.record_id || siteId),
              name: siteName,
              person: manager,
              isActive: true,
              status: "active",
              createdAt: String(r.created_at || today()),
              updatedAt: String(r.updated_at || r.created_at || nowIso()),
            });
          }

          if (
            String(r?.status || "") !== "deleted" &&
            !siteMap.has(siteId) &&
            siteId &&
            (siteName || manager)
          ) {
            siteMap.set(siteId, {
              id: siteId,
              recordId: siteId,
              name: siteName,
              person: manager,
              isActive: true,
              status: "active",
              createdAt: String(r.created_at || today()),
              updatedAt: String(r.updated_at || r.created_at || nowIso()),
            });
          }

          if (
            entityType === "site_creator" &&
            String(r?.status || "") !== "deleted" &&
            siteId &&
            creator
          ) {
            creatorMap[siteId] = creatorMap[siteId] || [];
            if (!creatorMap[siteId].some((x) => x.name === creator)) {
              creatorMap[siteId].push({
                name: creator,
                recordId: String(r.record_id || ""),
                createdAt: String(r.created_at || nowIso()),
                updatedAt: String(r.updated_at || nowIso()),
              });
            }
          }

          if (entityType === "work" && String(r?.status || "") !== "deleted") {
            restoredWorkLogs.push({
              id: String(r.record_id || ""),
              siteId,
              date: String(r.work_date || ""),
              creator,
              hours: Number(r.hours || 0),
              status: String(r.status || "active"),
              createdAt: String(r.created_at || nowIso()),
              updatedAt: String(r.updated_at || nowIso()),
            });

            if (siteId && creator) {
              creatorMap[siteId] = creatorMap[siteId] || [];
              if (!creatorMap[siteId].some((x) => x.name === creator)) {
                creatorMap[siteId].push({
                  name: creator,
                  recordId: "",
                  createdAt: "",
                  updatedAt: "",
                });
              }
            }
          }

          if (entityType === "material" && String(r?.status || "") !== "deleted") {
            restoredMaterials.push({
              id: String(r.record_id || ""),
              siteId,
              date: String(r.material_date || ""),
              creator,
              name: String(r.material_name || ""),
              thickness: String(r.material_thickness || ""),
              size: String(r.material_size || ""),
              qty: Number(r.qty || 0),
              unitPrice: Number(r.unit_price || 0),
              materialId: String(r.material_id || ""),
              status: String(r.status || "active"),
              createdAt: String(r.created_at || nowIso()),
              updatedAt: String(r.updated_at || nowIso()),
            });

            if (siteId && creator) {
              creatorMap[siteId] = creatorMap[siteId] || [];
              if (!creatorMap[siteId].some((x) => x.name === creator)) {
                creatorMap[siteId].push({
                  name: creator,
                  recordId: "",
                  createdAt: "",
                  updatedAt: "",
                });
              }
            }
          }
        });

        const restoredSites = Array.from(siteMap.values()).sort((a, b) =>
          String(b.createdAt).localeCompare(String(a.createdAt))
        );

        setSites(restoredSites);
        setSiteCreatorsMap(creatorMap);
        setWorkLogs(restoredWorkLogs);
        setMaterials(restoredMaterials);

        const nextSiteId =
          restoredSites.length > 0 ? String(restoredSites[0].id) : "";
        setSelectedSiteId(nextSiteId);

        const nextCreators = nextSiteId ? creatorMap[nextSiteId] || [] : [];
        const nextCreator =
          nextCreators.length > 0
            ? typeof nextCreators[0] === "string"
              ? nextCreators[0]
              : nextCreators[0].name
            : "";

        setCommonCreator(nextCreator);

        await flushQueue();
      } catch (e) {
        console.error("マスタ取得エラー", e);
        setMaterialMasters([]);
        setWorkerMasters([]);
        setManagerMasters([]);
      }
    };

    fetchBootstrap();
  }, []);

  useEffect(() => {
    fetchInvoiceSummary();
  }, [selectedMonth]);

  useEffect(() => {
    const id = window.setInterval(() => {
      flushQueue();
    }, 30000);

    const onFocus = () => {
      flushQueue();
      fetchInvoiceSummary();
    };
    window.addEventListener("focus", onFocus);

    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [selectedMonth]);

  const activeWorkLogs = useMemo(
    () => workLogs.filter((x) => x.status !== "deleted"),
    [workLogs]
  );

  const activeMaterials = useMemo(
    () => materials.filter((x) => x.status !== "deleted"),
    [materials]
  );

  useEffect(() => {
    if (!selectedSiteId && activeSites[0]) {
      setSelectedSiteId(String(activeSites[0].id));
    }
  }, [selectedSiteId, activeSites]);

  const selectedSite = useMemo(
    () =>
      activeSites.find((x) => String(x.id) === String(selectedSiteId)) || null,
    [activeSites, selectedSiteId]
  );

  const selectedSiteCreators = useMemo(
    () =>
      selectedSite
        ? (siteCreatorsMap[String(selectedSite.id)] || []).map((x) =>
            typeof x === "string" ? x : x.name
          )
        : [],
    [selectedSite, siteCreatorsMap]
  );

  useEffect(() => {
    if (
      selectedSite &&
      commonCreator &&
      !selectedSiteCreators.includes(commonCreator)
    ) {
      setCommonCreator(selectedSiteCreators[0] || "");
    }
  }, [selectedSite, commonCreator, selectedSiteCreators]);

  const managerNameOptions = useMemo(
    () => activeManagerMasters.map((x) => x.name).filter(Boolean),
    [activeManagerMasters]
  );

  const workerNameOptions = useMemo(
    () => activeWorkerMasters.map((x) => x.name).filter(Boolean),
    [activeWorkerMasters]
  );

  const materialNameOptions = useMemo(
    () =>
      Array.from(
        new Set(activeMaterialMasters.map((x) => x.name).filter(Boolean))
      ),
    [activeMaterialMasters]
  );

  const materialThicknessOptions = useMemo(
    () =>
      Array.from(
        new Set(
          activeMaterialMasters
            .filter((x) => x.name === materialName)
            .map((x) => x.thickness)
            .filter(Boolean)
        )
      ),
    [materialName, activeMaterialMasters]
  );

  const materialSizeOptions = useMemo(
    () =>
      Array.from(
        new Set(
          activeMaterialMasters
            .filter(
              (x) => x.name === materialName && x.thickness === materialThickness
            )
            .map((x) => x.size)
            .filter(Boolean)
        )
      ),
    [materialName, materialThickness, activeMaterialMasters]
  );

  const findMaterialMaster = (name, thickness, size) =>
    activeMaterialMasters.find(
      (x) => x.name === name && x.thickness === thickness && x.size === size
    ) || null;

  async function saveSite() {
    if (!siteName.trim()) return notify("現場名を入力してください");

    if (editingSiteId) {
      const current = sites.find((s) => String(s.id) === String(editingSiteId));
      if (!current) return notify("現場が見つかりません");

      const updated = {
        ...current,
        name: siteName.trim(),
        person: sitePerson,
        updatedAt: nowIso(),
      };

      setSites((prev) =>
        prev.map((s) => (String(s.id) === String(editingSiteId) ? updated : s))
      );

      await queueRecords([toSiteGasRecord(updated)]);
      setEditingSiteId("");
      setSiteName("");
      setSitePerson(managerNameOptions[0] || "");
      return notify("現場を更新しました");
    }

    const id = makeId("site");
    const localSite = {
      id,
      recordId: makeId("site_rec"),
      name: siteName.trim(),
      person: sitePerson,
      isActive: true,
      status: "active",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    setSites((prev) => [localSite, ...prev]);
    setSelectedSiteId(id);

    await queueRecords([toSiteGasRecord(localSite)]);

    setSiteName("");
    setSitePerson(managerNameOptions[0] || "");
    notify("現場を登録しました");
  }

  function editSite(site) {
    setEditingSiteId(String(site.id));
    setSiteName(site.name || "");
    setSitePerson(site.person || managerNameOptions[0] || "");
    setScreen("site");
  }

  function openSite(site) {
    setSelectedSiteId(String(site.id));

    const creators = siteCreatorsMap[String(site.id)] || [];
    const firstCreator =
      creators.length > 0
        ? typeof creators[0] === "string"
          ? creators[0]
          : creators[0].name
        : "";

    setCommonCreator(firstCreator);
    setScreen("creator");
  }

  async function addCreator() {
    if (!selectedSite) return notify("先に現場を選んでください");
    const name = String(newCreatorName || "").trim();
    if (!name) return notify("制作者を選んでください");

    const currentCreators = siteCreatorsMap[String(selectedSite.id)] || [];
    if (
      currentCreators.some((x) => (typeof x === "string" ? x : x.name) === name)
    ) {
      return notify("この制作者は登録済みです");
    }

    const creatorRecordId = makeId("site_creator");
    const createdAt = nowIso();

    setSiteCreatorsMap((prev) => ({
      ...prev,
      [String(selectedSite.id)]: [
        ...(prev[String(selectedSite.id)] || []),
        {
          name,
          recordId: creatorRecordId,
          createdAt,
          updatedAt: createdAt,
        },
      ],
    }));

    setCommonCreator(name);
    setNewCreatorName("");

    await queueRecords([
      toSiteCreatorGasRecord({
        siteId: selectedSite.id,
        siteName: selectedSite.name,
        manager: selectedSite.person,
        creator: name,
        recordId: creatorRecordId,
        createdAt,
        updatedAt: createdAt,
      }),
    ]);
    await flushQueue();

    notify("制作者を登録しました");
  }

  async function saveWork() {
    if (!selectedSite) return notify("先に現場を選んでください");
    if (!String(workHours).trim()) return notify("作業時間を入力してください");
    if (!commonCreator) return notify("制作者を選んでください");

    const hours = Number(workHours || 0);
    if (!hours) return notify("作業時間を入力してください");

    if (editingWorkId) {
      const current = workLogs.find((x) => String(x.id) === String(editingWorkId));
      if (!current) return notify("編集対象が見つかりません");

      const updated = {
        ...current,
        date: workDate,
        creator: commonCreator || "未入力",
        hours,
        updatedAt: nowIso(),
      };

      setWorkLogs((prev) =>
        prev.map((x) => (String(x.id) === String(editingWorkId) ? updated : x))
      );

      await queueRecords([toWorkGasRecord(updated, selectedSite)]);
      await fetchInvoiceSummary();

      setEditingWorkId("");
      setWorkDate(today());
      setWorkHours("");
      return notify("作業を更新しました");
    }

    const localRecord = {
      id: makeId("work"),
      siteId: String(selectedSite.id),
      date: workDate,
      creator: commonCreator || "未入力",
      hours,
      status: "active",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    setWorkLogs((prev) => [localRecord, ...prev]);

    await queueRecords([toWorkGasRecord(localRecord, selectedSite)]);
    await fetchInvoiceSummary();

    setWorkDate(today());
    setWorkHours("");
    notify("作業を追加しました");
  }

  async function saveMaterial() {
    if (!selectedSite) return notify("先に現場を選んでください");
    if (!commonCreator) return notify("制作者を選んでください");
    if (!materialName) return notify("材料名を選んでください");
    if (!materialThickness) return notify("厚みを選んでください");
    if (!materialSize) return notify("サイズを選んでください");
    if (!String(materialQty).trim()) return notify("材料枚数を入力してください");

    const qty = Number(materialQty || 0);
    if (!qty) return notify("材料枚数を入力してください");

    const master = findMaterialMaster(materialName, materialThickness, materialSize);

    if (editingMaterialId) {
      const current = materials.find(
        (x) => String(x.id) === String(editingMaterialId)
      );
      if (!current) return notify("編集対象が見つかりません");

      const updated = {
        ...current,
        date: materialDate,
        creator: commonCreator || "未入力",
        name: materialName,
        thickness: materialThickness,
        size: materialSize,
        qty,
        unitPrice: Number(master?.unit_price || 0),
        materialId: master?.id || "",
        updatedAt: nowIso(),
      };

      setMaterials((prev) =>
        prev.map((x) => (String(x.id) === String(editingMaterialId) ? updated : x))
      );

      await queueRecords([toMaterialGasRecord(updated, selectedSite)]);
      await fetchInvoiceSummary();

      setEditingMaterialId("");
      setMaterialDate(today());
      setMaterialName("");
      setMaterialThickness("");
      setMaterialSize("");
      setMaterialQty("");
      return notify("材料を更新しました");
    }

    const localRecord = {
      id: makeId("material"),
      siteId: String(selectedSite.id),
      date: materialDate,
      creator: commonCreator || "未入力",
      name: materialName,
      thickness: materialThickness,
      size: materialSize,
      qty,
      unitPrice: Number(master?.unit_price || 0),
      materialId: master?.id || "",
      status: "active",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    setMaterials((prev) => [localRecord, ...prev]);

    await queueRecords([toMaterialGasRecord(localRecord, selectedSite)]);
    await fetchInvoiceSummary();

    setMaterialDate(today());
    setMaterialName("");
    setMaterialThickness("");
    setMaterialSize("");
    setMaterialQty("");
    notify("材料を追加しました");
  }

  function editWork(row) {
    setEditingWorkId(String(row.id));
    setWorkDate(row.date || today());
    setWorkHours(String(row.hours || ""));
    setCommonCreator(row.creator || "");
    setScreen("work");
  }

  async function deleteSite(siteId) {
    const site = sites.find((s) => String(s.id) === String(siteId));
    if (!site) return;
    if (!window.confirm(`現場「${site.name}」を削除しますか？`)) return;

    const now = nowIso();
    const deletedSite = {
      ...site,
      status: "deleted",
      updatedAt: now,
    };

    const relatedCreators = siteCreatorsMap[String(siteId)] || [];
    const relatedWorks = workLogs.filter((x) => String(x.siteId) === String(siteId));
    const relatedMaterials = materials.filter((x) => String(x.siteId) === String(siteId));

    setSites((prev) =>
      prev.map((s) => (String(s.id) === String(siteId) ? deletedSite : s))
    );

    setWorkLogs((prev) =>
      prev.map((x) =>
        String(x.siteId) === String(siteId) ? { ...x, status: "deleted", updatedAt: now } : x
      )
    );

    setMaterials((prev) =>
      prev.map((x) =>
        String(x.siteId) === String(siteId) ? { ...x, status: "deleted", updatedAt: now } : x
      )
    );

    setSiteCreatorsMap((prev) => {
      const next = { ...prev };
      delete next[String(siteId)];
      return next;
    });

    if (String(selectedSiteId) === String(siteId)) {
      setSelectedSiteId("");
      setCommonCreator("");
      setScreen("site");
    }

    const records = [
      toSiteGasRecord(deletedSite),
      ...relatedCreators.map((item) =>
        toSiteCreatorGasRecord({
          siteId,
          siteName: site.name,
          manager: site.person,
          creator: item.name,
          recordId: item.recordId,
          createdAt: item.createdAt,
          updatedAt: now,
          status: "deleted",
        })
      ),
      ...relatedWorks.map((row) =>
        toWorkGasRecord({ ...row, status: "deleted", updatedAt: now }, site)
      ),
      ...relatedMaterials.map((row) =>
        toMaterialGasRecord({ ...row, status: "deleted", updatedAt: now }, site)
      ),
    ];

    await queueRecords(records);
    await fetchInvoiceSummary();
    notify("現場を削除しました");
  }

  async function deleteCreator(siteId, creator) {
    const site = sites.find((s) => String(s.id) === String(siteId));
    if (!site) return;
    if (!window.confirm(`制作者「${creator}」を削除しますか？`)) return;

    const now = nowIso();
    const creatorEntry = (siteCreatorsMap[String(siteId)] || []).find(
      (x) => x.name === creator
    );

    const relatedWorks = workLogs.filter(
      (x) => String(x.siteId) === String(siteId) && String(x.creator) === String(creator)
    );
    const relatedMaterials = materials.filter(
      (x) => String(x.siteId) === String(siteId) && String(x.creator) === String(creator)
    );

    setWorkLogs((prev) =>
      prev.map((x) =>
        String(x.siteId) === String(siteId) && String(x.creator) === String(creator)
          ? { ...x, status: "deleted", updatedAt: now }
          : x
      )
    );

    setMaterials((prev) =>
      prev.map((x) =>
        String(x.siteId) === String(siteId) && String(x.creator) === String(creator)
          ? { ...x, status: "deleted", updatedAt: now }
          : x
      )
    );

    setSiteCreatorsMap((prev) => ({
      ...prev,
      [String(siteId)]: (prev[String(siteId)] || []).filter((x) => x.name !== creator),
    }));

    if (String(selectedSiteId) === String(siteId) && commonCreator === creator) {
      const nextCreators = (siteCreatorsMap[String(siteId)] || [])
        .filter((x) => x.name !== creator)
        .map((x) => x.name);
      setCommonCreator(nextCreators[0] || "");
      if (nextCreators.length === 0) {
        setScreen("creator");
      }
    }

    const records = [
      toSiteCreatorGasRecord({
        siteId,
        siteName: site.name,
        manager: site.person,
        creator,
        recordId: creatorEntry?.recordId,
        createdAt: creatorEntry?.createdAt,
        updatedAt: now,
        status: "deleted",
      }),
      ...relatedWorks.map((row) =>
        toWorkGasRecord({ ...row, status: "deleted", updatedAt: now }, site)
      ),
      ...relatedMaterials.map((row) =>
        toMaterialGasRecord({ ...row, status: "deleted", updatedAt: now }, site)
      ),
    ];

    await queueRecords(records);
    await flushQueue();
    await fetchInvoiceSummary();
    notify("制作者を削除しました");
  }

  async function deleteWork(id) {
    const target = workLogs.find((x) => String(x.id) === String(id));
    if (!target) return;

    const updated = { ...target, status: "deleted", updatedAt: nowIso() };

    setWorkLogs((prev) =>
      prev.map((x) => (String(x.id) === String(id) ? updated : x))
    );

    await queueRecords([toWorkGasRecord(updated, selectedSite)]);
    await fetchInvoiceSummary();
    notify("作業を削除しました");
  }

  function editMaterial(row) {
    setEditingMaterialId(String(row.id));
    setMaterialDate(row.date || today());
    setMaterialName(row.name || "");
    setMaterialThickness(row.thickness || "");
    setMaterialSize(row.size || "");
    setMaterialQty(String(row.qty || ""));
    setCommonCreator(row.creator || "");
    setScreen("work");
  }

  async function deleteMaterial(id) {
    const target = materials.find((x) => String(x.id) === String(id));
    if (!target) return;

    const updated = { ...target, status: "deleted", updatedAt: nowIso() };

    setMaterials((prev) =>
      prev.map((x) => (String(x.id) === String(id) ? updated : x))
    );

    await queueRecords([toMaterialGasRecord(updated, selectedSite)]);
    await fetchInvoiceSummary();
    notify("材料を削除しました");
  }

  const creatorCards = useMemo(() => {
    if (!selectedSite) return [];
    return (siteCreatorsMap[String(selectedSite.id)] || []).map((item) => {
      const name = item.name;
      const works = activeWorkLogs.filter(
        (x) =>
          String(x.siteId) === String(selectedSite.id) &&
          String(x.creator) === String(name)
      );
      const mats = activeMaterials.filter(
        (x) =>
          String(x.siteId) === String(selectedSite.id) &&
          String(x.creator) === String(name)
      );
      return {
        name,
        recordId: item.recordId,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        workHoursTotal: works.reduce((sum, x) => sum + Number(x.hours || 0), 0),
        materialQtyTotal: mats.reduce((sum, x) => sum + Number(x.qty || 0), 0),
      };
    });
  }, [selectedSite, siteCreatorsMap, activeWorkLogs, activeMaterials]);

  const creatorWorkLogs = useMemo(() => {
    if (!selectedSite) return [];
    return activeWorkLogs.filter((x) => {
      if (String(x.siteId) !== String(selectedSite.id)) return false;
      if (commonCreator && String(x.creator) !== String(commonCreator)) return false;
      return true;
    });
  }, [selectedSite, commonCreator, activeWorkLogs]);

  const creatorMaterials = useMemo(() => {
    if (!selectedSite) return [];
    return activeMaterials.filter((x) => {
      if (String(x.siteId) !== String(selectedSite.id)) return false;
      if (commonCreator && String(x.creator) !== String(commonCreator)) return false;
      return true;
    });
  }, [selectedSite, commonCreator, activeMaterials]);

  const displayInvoiceRows = useMemo(
    () =>
      serverInvoiceRows.map((r) => ({
        siteId: r.site_id,
        siteName: r.site_name,
        manager: r.manager,
        creator: r.creator || "",
        workHoursTotal: Number(r.work_hours_total || 0),
        materialQtyTotal: Number(r.material_qty_total || 0),
        workAmount: Number(r.work_amount || 0),
        materialAmount: Number(r.material_amount || 0),
        total: Number(r.total_amount || 0),
      })),
    [serverInvoiceRows]
  );

  const invoiceSummary = useMemo(
    () => ({
      workAmount: Number(serverInvoiceTotals.work_amount || 0),
      materialAmount: Number(serverInvoiceTotals.material_amount || 0),
      total: Number(serverInvoiceTotals.total_amount || 0),
    }),
    [serverInvoiceTotals]
  );

  const invoiceTotal = useMemo(() => invoiceSummary.total, [invoiceSummary]);
  const workInvoiceTotal = useMemo(() => invoiceSummary.workAmount, [invoiceSummary]);
  const materialInvoiceTotal = useMemo(
    () => invoiceSummary.materialAmount,
    [invoiceSummary]
  );

  function exportInvoiceCsv() {
    const header = [
      "集計区分",
      "対象期間",
      "現場名",
      "担当者",
      "制作者",
      "作業時間",
      "材料枚数",
      "作業請求",
      "材料請求",
      "請求金額",
    ];

    const rows = displayInvoiceRows.map((r) => [
      "月次",
      selectedMonth,
      r.siteName,
      r.manager,
      r.creator,
      r.workHoursTotal,
      r.materialQtyTotal,
      r.workAmount,
      r.materialAmount,
      r.total,
    ]);

    const csv = [header, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")
      )
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `請求集計_${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function movePrev() {
    const order = ["site", "creator", "work", "invoice"];
    const idx = order.indexOf(screen);
    if (idx > 0) setScreen(order[idx - 1]);
  }

  function moveNext() {
    const order = ["site", "creator", "work", "invoice"];
    const idx = order.indexOf(screen);
    if (screen === "site" && !selectedSite) return notify("先に現場を選んでください");
    if (screen === "creator" && !commonCreator) return notify("先に制作者を選んでください");
    if (idx < order.length - 1) setScreen(order[idx + 1]);
  }

  const cardStyle = {
    background: "#fff",
    border: "1px solid #d9e0ea",
    borderRadius: 12,
    boxShadow: "0 4px 12px rgba(17,24,39,0.05)",
    padding: 10,
  };

  const inputStyle = {
    width: "100%",
    padding: "7px 9px",
    border: "1px solid #cfd8e3",
    borderRadius: 8,
    fontSize: 12,
    boxSizing: "border-box",
    background: "#fff",
  };

  const buttonStyle = {
    padding: "7px 10px",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 12,
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#eef3f8",
        padding: 8,
        color: "#1f2937",
        boxSizing: "border-box",
      }}
    >
      <style>{`
        * { box-sizing: border-box; }
        .ga-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
        .ga-grid-3 { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
        .ga-grid-4 { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; }
        .ga-grid-5 { display:grid; grid-template-columns:repeat(5,1fr); gap:8px; }
        .ga-list { display:flex; flex-direction:column; gap:6px; }
        .ga-btn-secondary { background:#eef4fb; color:#1f2937; }
        .ga-btn-primary { background:#2f6fec; color:#fff; }
        .ga-btn-danger { background:#e74c3c; color:#fff; }
        .ga-btn-dark { background:#111827; color:#fff; }
        .ga-kpi { background:linear-gradient(180deg,#ffffff 0%,#f7f9fc 100%); border:1px solid #d9e0ea; border-radius:10px; padding:8px; }
        .ga-table { width:100%; border-collapse:collapse; }
        .ga-table th, .ga-table td { padding:6px 6px; border-bottom:1px solid #e5e7eb; text-align:left; font-size:11px; white-space:nowrap; }
        .ga-table th { background:#f8fafc; }
        .ga-card-button { width:100%; text-align:left; background:#fff; border:1px solid #dbe3ee; border-radius:10px; padding:8px; cursor:pointer; }
        @media (max-width:980px){
          .ga-grid-3,.ga-grid-4,.ga-grid-5{ grid-template-columns:1fr; }
        }
      `}</style>

      <div style={{ ...cardStyle, marginBottom: 8, padding: 8 }}>
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              style={{
                ...buttonStyle,
                padding: "4px 12px",
                fontSize: 34,
                lineHeight: 1,
                minWidth: 56,
                borderRadius: 12,
              }}
              className="ga-btn-secondary"
              onClick={movePrev}
            >
              ←
            </button>

            <button
              style={{
                ...buttonStyle,
                padding: "4px 12px",
                fontSize: 34,
                lineHeight: 1,
                minWidth: 56,
                borderRadius: 12,
              }}
              className="ga-btn-secondary"
              onClick={moveNext}
            >
              →
            </button>
          </div>

          {message ? (
            <div style={{ fontWeight: 700, color: "#2457c5", fontSize: 12 }}>
              {message}
            </div>
          ) : null}
        </div>
      </div>

      {screen === "site" && (
        <>
          <div style={cardStyle}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>1. 現場登録</h2>

            <div
              style={{
                marginTop: 8,
                display: "grid",
                gridTemplateColumns: "1.7fr 1fr auto",
                gap: 8,
                alignItems: "end",
              }}
            >
              <div>
                <div style={{ marginBottom: 4, fontSize: 11, fontWeight: 700 }}>現場名</div>
                <input
                  style={inputStyle}
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                />
              </div>

              <div>
                <div style={{ marginBottom: 4, fontSize: 11, fontWeight: 700 }}>担当者</div>
                <select
                  style={inputStyle}
                  value={sitePerson}
                  onChange={(e) => setSitePerson(e.target.value)}
                >
                  <option value="">選択してください</option>
                  {managerNameOptions.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div
                style={{ display: "flex", alignItems: "end", gap: 6, whiteSpace: "nowrap" }}
              >
                <button style={buttonStyle} className="ga-btn-primary" onClick={saveSite}>
                  {editingSiteId ? "現場更新" : "現場登録"}
                </button>
                {editingSiteId ? (
                  <button
                    style={buttonStyle}
                    className="ga-btn-secondary"
                    onClick={() => {
                      setEditingSiteId("");
                      setSiteName("");
                      setSitePerson(managerNameOptions[0] || "");
                    }}
                  >
                    取消
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div style={{ ...cardStyle, marginTop: 8 }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>登録済み現場一覧</h2>

            <div className="ga-list" style={{ marginTop: 8 }}>
              {activeSites.length === 0 ? (
                <div style={{ color: "#6b7280", fontSize: 11 }}>登録済み現場はありません</div>
              ) : (
                activeSites.map((site) => {
                  const works = activeWorkLogs.filter(
                    (x) => String(x.siteId) === String(site.id)
                  );
                  const mats = activeMaterials.filter(
                    (x) => String(x.siteId) === String(site.id)
                  );
                  const active = String(selectedSiteId) === String(site.id);

                  return (
                    <div
                      key={site.id}
                      style={{
                        border: active ? "2px solid #2f6fec" : "1px solid #dbe3ee",
                        borderRadius: 10,
                        background: active ? "#f5f9ff" : "#fff",
                        padding: 8,
                      }}
                    >
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr auto",
                          gap: 8,
                          alignItems: "center",
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.2 }}>
                            {site.name}
                          </div>
                          <div
                            style={{
                              marginTop: 2,
                              color: "#4b5563",
                              fontSize: 11,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            担当者:{site.person} / 作業:{works.length} / 材料:{mats.length} / 月:
                            {monthOf(site.createdAt)}
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: 6, flexWrap: "nowrap" }}>
                          <button
                            style={buttonStyle}
                            className="ga-btn-secondary"
                            onClick={() => editSite(site)}
                          >
                            編集
                          </button>
                          <button
                            style={buttonStyle}
                            className="ga-btn-danger"
                            onClick={() => deleteSite(site.id)}
                          >
                            削除
                          </button>
                          <button
                            style={buttonStyle}
                            className="ga-btn-primary"
                            onClick={() => openSite(site)}
                          >
                            開く
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      {screen === "creator" && (
        <div style={cardStyle}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>2. 制作者選択</h2>

          {!selectedSite ? (
            <div style={{ marginTop: 8, color: "#6b7280", fontSize: 11 }}>
              先に現場を選んでください
            </div>
          ) : (
            <>
              <div style={{ marginTop: 8, fontWeight: 800, fontSize: 14 }}>
                選択中現場: {selectedSite.name}
              </div>
              <div style={{ marginTop: 2, color: "#4b5563", fontSize: 11 }}>
                担当者: {selectedSite.person}
              </div>

              <div className="ga-grid-3" style={{ marginTop: 8 }}>
                <div>
                  <div style={{ marginBottom: 4, fontSize: 11, fontWeight: 700 }}>
                    新規制作者登録
                  </div>
                  <select
                    style={inputStyle}
                    value={newCreatorName}
                    onChange={(e) => setNewCreatorName(e.target.value)}
                  >
                    <option value="">選択してください</option>
                    {workerNameOptions
                      .filter(
                        (name) =>
                          !(siteCreatorsMap[String(selectedSite?.id)] || []).some(
                            (x) => (typeof x === "string" ? x : x.name) === name
                          )
                      )
                      .map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                  </select>
                </div>

                <div style={{ display: "flex", alignItems: "end" }}>
                  <button style={buttonStyle} className="ga-btn-primary" onClick={addCreator}>
                    制作者登録
                  </button>
                </div>

                <div style={{ display: "flex", alignItems: "end" }}>
                  <button
                    style={buttonStyle}
                    className="ga-btn-secondary"
                    onClick={() => setScreen("site")}
                  >
                    現場へ戻る
                  </button>
                </div>
              </div>

              <div
                style={{
                  marginTop: 8,
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                {creatorCards.length === 0 ? (
                  <div style={{ color: "#6b7280", fontSize: 11 }}>制作者が未登録です</div>
                ) : (
                  creatorCards.map((card) => (
                    <div
                      key={card.name}
                      style={{
                        border:
                          commonCreator === card.name
                            ? "2px solid #2f6fec"
                            : "1px solid #dbe3ee",
                        borderRadius: 10,
                        background: commonCreator === card.name ? "#f5f9ff" : "#fff",
                        padding: 8,
                      }}
                    >
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr auto",
                          gap: 8,
                          alignItems: "start",
                        }}
                      >
                        <button
                          className="ga-card-button"
                          style={{
                            border: "none",
                            padding: 0,
                            background: "transparent",
                            boxShadow: "none",
                          }}
                          onClick={() => {
                            setCommonCreator(card.name);
                            setScreen("work");
                          }}
                        >
                          <div style={{ fontSize: 13, fontWeight: 800 }}>{card.name}</div>
                          <div
                            style={{
                              marginTop: 4,
                              fontSize: 11,
                              color: "#4b5563",
                              lineHeight: 1.4,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            作業時間合計:{fmt(card.workHoursTotal)}h / 材料合計:
                            {fmt(card.materialQtyTotal)}枚
                          </div>
                        </button>

                        <button
                          style={buttonStyle}
                          className="ga-btn-danger"
                          onClick={() => deleteCreator(selectedSite.id, card.name)}
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      )}

      {screen === "work" && (
        <div style={cardStyle}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>3. 現場別作業登録</h2>

          {!selectedSite ? (
            <div style={{ marginTop: 8, color: "#6b7280", fontSize: 11 }}>
              先に現場を選んでください
            </div>
          ) : (
            <>
              <div
                style={{
                  marginTop: 8,
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  flexWrap: "nowrap",
                  fontSize: 11,
                  fontWeight: 700,
                  overflowX: "auto",
                }}
              >
                <span>現場名:{selectedSite.name}</span>
                <span>担当者:{selectedSite.person}</span>
                <span>制作者:{commonCreator || "未選択"}</span>
                <input
                  style={{ ...inputStyle, width: 120, flex: "0 0 auto" }}
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                />
              </div>

              <div className="ga-grid-2" style={{ marginTop: 8 }}>
                <div style={{ ...cardStyle, padding: 8, background: "#f8fbff" }}>
                  <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 8 }}>
                    作業登録
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: 8,
                    }}
                  >
                    <div>
                      <div style={{ marginBottom: 4, fontSize: 11, fontWeight: 700 }}>日付</div>
                      <input
                        style={inputStyle}
                        type="date"
                        value={workDate}
                        onChange={(e) => setWorkDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <div style={{ marginBottom: 4, fontSize: 11, fontWeight: 700 }}>
                        作業時間
                      </div>
                      <input
                        style={inputStyle}
                        type="number"
                        step="0.5"
                        value={workHours}
                        onChange={(e) => setWorkHours(e.target.value)}
                      />
                    </div>
                    <div>
                      <div style={{ marginBottom: 4, fontSize: 11, fontWeight: 700 }}>
                        制作者
                      </div>
                      <select
                        style={inputStyle}
                        value={commonCreator}
                        onChange={(e) => setCommonCreator(e.target.value)}
                      >
                        <option value="">選択してください</option>
                        {selectedSiteCreators.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button
                      style={buttonStyle}
                      className="ga-btn-primary"
                      onClick={saveWork}
                    >
                      {editingWorkId ? "作業更新" : "作業追加"}
                    </button>
                  </div>
                </div>

                <div style={{ ...cardStyle, padding: 8, background: "#fffaf5" }}>
                  <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 8 }}>
                    材料登録
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.1fr 1.4fr 1fr 1fr 0.7fr",
                      gap: 8,
                    }}
                  >
                    <div>
                      <div style={{ marginBottom: 4, fontSize: 11, fontWeight: 700 }}>日付</div>
                      <input
                        style={inputStyle}
                        type="date"
                        value={materialDate}
                        onChange={(e) => setMaterialDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <div style={{ marginBottom: 4, fontSize: 11, fontWeight: 700 }}>
                        材料名
                      </div>
                      <select
                        style={inputStyle}
                        value={materialName}
                        onChange={(e) => {
                          setMaterialName(e.target.value);
                          setMaterialThickness("");
                          setMaterialSize("");
                        }}
                      >
                        <option value="">選択してください</option>
                        {materialNameOptions.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <div style={{ marginBottom: 4, fontSize: 11, fontWeight: 700 }}>
                        厚み
                      </div>
                      <select
                        style={inputStyle}
                        value={materialThickness}
                        onChange={(e) => {
                          setMaterialThickness(e.target.value);
                          setMaterialSize("");
                        }}
                      >
                        <option value="">選択してください</option>
                        {materialThicknessOptions.map((thickness) => (
                          <option key={thickness} value={thickness}>
                            {thickness}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <div style={{ marginBottom: 4, fontSize: 11, fontWeight: 700 }}>
                        サイズ
                      </div>
                      <select
                        style={inputStyle}
                        value={materialSize}
                        onChange={(e) => setMaterialSize(e.target.value)}
                      >
                        <option value="">選択してください</option>
                        {materialSizeOptions.map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <div style={{ marginBottom: 4, fontSize: 11, fontWeight: 700 }}>枚</div>
                      <input
                        style={inputStyle}
                        type="number"
                        step="0.1"
                        value={materialQty}
                        onChange={(e) => setMaterialQty(e.target.value)}
                      />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button
                      style={buttonStyle}
                      className="ga-btn-primary"
                      onClick={saveMaterial}
                    >
                      {editingMaterialId ? "材料更新" : "材料追加"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="ga-grid-2" style={{ marginTop: 8 }}>
                <div style={cardStyle}>
                  <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 8 }}>
                    作業一覧
                  </div>
                  <div style={{ maxHeight: 300, overflow: "auto" }}>
                    <table className="ga-table">
                      <thead>
                        <tr>
                          <th>日付</th>
                          <th>制作者</th>
                          <th>時間</th>
                          <th>操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {creatorWorkLogs.length === 0 ? (
                          <tr>
                            <td colSpan="4">作業データがありません</td>
                          </tr>
                        ) : (
                          creatorWorkLogs.map((row) => (
                            <tr key={row.id}>
                              <td>{fmtDate(row.date)}</td>
                              <td>{row.creator}</td>
                              <td>{fmt(row.hours)}</td>
                              <td>
                                <div style={{ display: "flex", gap: 4 }}>
                                  <button
                                    style={buttonStyle}
                                    className="ga-btn-secondary"
                                    onClick={() => editWork(row)}
                                  >
                                    編集
                                  </button>
                                  <button
                                    style={buttonStyle}
                                    className="ga-btn-danger"
                                    onClick={() => deleteWork(row.id)}
                                  >
                                    削除
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div style={cardStyle}>
                  <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 8 }}>
                    材料一覧
                  </div>
                  <div style={{ maxHeight: 300, overflow: "auto" }}>
                    <table className="ga-table">
                      <thead>
                        <tr>
                          <th>日付</th>
                          <th>制作者</th>
                          <th>材料名</th>
                          <th>厚み</th>
                          <th>サイズ</th>
                          <th>枚数</th>
                          <th>単価</th>
                          <th>金額</th>
                          <th>操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {creatorMaterials.length === 0 ? (
                          <tr>
                            <td colSpan="9">材料データがありません</td>
                          </tr>
                        ) : (
                          creatorMaterials.map((row) => (
                            <tr key={row.id}>
                              <td>{fmtDate(row.date)}</td>
                              <td>{row.creator}</td>
                              <td>{row.name}</td>
                              <td>{row.thickness || ""}</td>
                              <td>{row.size}</td>
                              <td>{fmt(row.qty)}</td>
                              <td>{fmt(row.unitPrice)}</td>
                              <td>{fmt(row.qty * row.unitPrice * 1.35)}</td>
                              <td>
                                <div style={{ display: "flex", gap: 4 }}>
                                  <button
                                    style={buttonStyle}
                                    className="ga-btn-secondary"
                                    onClick={() => editMaterial(row)}
                                  >
                                    編集
                                  </button>
                                  <button
                                    style={buttonStyle}
                                    className="ga-btn-danger"
                                    onClick={() => deleteMaterial(row.id)}
                                  >
                                    削除
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {screen === "invoice" && (
        <div style={cardStyle}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>4. 請求書・集計</h2>

          <div
            style={{
              marginTop: 8,
              display: "grid",
              gridTemplateColumns: "140px auto",
              gap: 8,
              alignItems: "end",
            }}
          >
            <div>
              <div style={{ marginBottom: 4, fontSize: 11, fontWeight: 700 }}>月選択</div>
              <input
                style={inputStyle}
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            </div>

            <div
              style={{
                display: "flex",
                gap: 6,
                flexWrap: "nowrap",
                justifyContent: "flex-start",
                alignItems: "end",
              }}
            >
              <button
                style={buttonStyle}
                className="ga-btn-secondary"
                onClick={exportInvoiceCsv}
              >
                CSV出力
              </button>
              <button
                style={buttonStyle}
                className="ga-btn-dark"
                onClick={() => window.print()}
              >
                A3印刷
              </button>
              <button
                style={buttonStyle}
                className="ga-btn-secondary"
                onClick={() => setScreen("work")}
              >
                作業画面へ戻る
              </button>
            </div>
          </div>

          {invoiceLoading && (
            <div style={{ fontSize: 11, color: "#666", marginTop: 8 }}>
              請求金額を読込中...
            </div>
          )}

          {!!invoiceError && (
            <div style={{ fontSize: 11, color: "#d32f2f", marginTop: 8 }}>
              {invoiceError}
            </div>
          )}

          <div
            style={{
              marginTop: 8,
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 8,
            }}
          >
            <div className="ga-kpi">
              <div style={{ fontSize: 11, color: "#6b7280" }}>作業請求総額</div>
              <div style={{ marginTop: 4, fontWeight: 800, fontSize: 13 }}>
                {fmt(workInvoiceTotal)}円
              </div>
            </div>
            <div className="ga-kpi">
              <div style={{ fontSize: 11, color: "#6b7280" }}>材料費合計</div>
              <div style={{ marginTop: 4, fontWeight: 800, fontSize: 13 }}>
                {fmt(materialInvoiceTotal)}円
              </div>
            </div>
            <div className="ga-kpi">
              <div style={{ fontSize: 11, color: "#6b7280" }}>請求総額</div>
              <div style={{ marginTop: 4, fontWeight: 800, fontSize: 13 }}>
                {fmt(invoiceTotal)}円
              </div>
            </div>
          </div>

          <div style={{ ...cardStyle, marginTop: 8 }}>
            <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 8 }}>請求一覧</div>
            <div style={{ maxHeight: 420, overflow: "auto" }}>
              <table className="ga-table">
                <thead>
                  <tr>
                    <th>現場名</th>
                    <th>担当者</th>
                    <th>制作者</th>
                    <th>作業時間</th>
                    <th>材料枚数</th>
                    <th>作業請求</th>
                    <th>材料請求</th>
                    <th>請求金額</th>
                  </tr>
                </thead>
                <tbody>
                  {displayInvoiceRows.length === 0 ? (
                    <tr>
                      <td colSpan="8">対象データがありません</td>
                    </tr>
                  ) : (
                    displayInvoiceRows.map((row) => (
                      <tr key={`${row.siteId}_${row.creator}`}>
                        <td>{row.siteName}</td>
                        <td>{row.manager}</td>
                        <td>{row.creator}</td>
                        <td>{fmt(row.workHoursTotal)}</td>
                        <td>{fmt(row.materialQtyTotal)}</td>
                        <td>{fmt(row.workAmount)}円</td>
                        <td>{fmt(row.materialAmount)}円</td>
                        <td style={{ fontWeight: 800 }}>{fmt(row.total)}円</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}