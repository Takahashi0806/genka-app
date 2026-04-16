import React, { useEffect, useMemo, useRef, useState } from "react";

function Card({ children, style = {}, onClick, id }) {
  return (
    <div
      id={id}
      onClick={onClick}
      style={{
        borderRadius: 24,
        border: "1px solid #e2e8f0",
        background: "#ffffff",
        boxShadow: "0 1px 3px rgba(15,23,42,0.06)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Label({ children }) {
  return (
    <div
      style={{
        marginBottom: 8,
        fontSize: 12,
        fontWeight: 600,
        color: "#64748b",
      }}
    >
      {children}
    </div>
  );
}

function Button({
  children,
  primary = false,
  dark = false,
  onClick,
  className = "",
  disabled = false,
  style = {},
}) {
  const bg = dark ? "#0f172a" : primary ? "#2563eb" : "#ffffff";
  const color = dark || primary ? "#ffffff" : "#334155";
  const border = dark || primary ? "none" : "1px solid #e2e8f0";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={className}
      style={{
        height: 48,
        borderRadius: 16,
        padding: "0 16px",
        fontSize: 14,
        fontWeight: 700,
        cursor: disabled ? "default" : "pointer",
        background: disabled ? "#cbd5e1" : bg,
        color: disabled ? "#ffffff" : color,
        border,
        boxShadow: "0 1px 2px rgba(15,23,42,0.06)",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function SmallButton({ children, onClick, danger = false }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      style={{
        borderRadius: 10,
        border: danger ? "none" : "1px solid #e2e8f0",
        background: danger ? "#ef4444" : "#ffffff",
        color: danger ? "#ffffff" : "#334155",
        padding: "6px 10px",
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function SelectField({ value, options, onChange }) {
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          height: 48,
          width: "100%",
          appearance: "none",
          borderRadius: 16,
          border: "1px solid #e2e8f0",
          background: "#ffffff",
          padding: "0 44px 0 14px",
          fontSize: 14,
          color: "#334155",
          outline: "none",
        }}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <div
        style={{
          pointerEvents: "none",
          position: "absolute",
          inset: "0 14px 0 auto",
          display: "flex",
          alignItems: "center",
          color: "#94a3b8",
          fontSize: 12,
        }}
      >
        ▼
      </div>
    </div>
  );
}

function DateField({ value, onChange }) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        height: 48,
        width: "100%",
        borderRadius: 16,
        border: "1px solid #e2e8f0",
        background: "#ffffff",
        padding: "0 14px",
        fontSize: 14,
        color: "#334155",
        outline: "none",
      }}
    />
  );
}

function NumberField({ value, onChange, step = "1", placeholder }) {
  return (
    <input
      type="number"
      inputMode="decimal"
      value={value}
      step={step}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{
        height: 48,
        width: "100%",
        borderRadius: 16,
        border: "1px solid #e2e8f0",
        background: "#f8fafc",
        padding: "0 14px",
        fontSize: 14,
        color: "#334155",
        outline: "none",
      }}
    />
  );
}

function TextField({ value, onChange, placeholder }) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{
        height: 48,
        width: "100%",
        borderRadius: 16,
        border: "1px solid #e2e8f0",
        background: "#f8fafc",
        padding: "0 14px",
        fontSize: 14,
        color: "#334155",
        outline: "none",
      }}
    />
  );
}

export default function App() {
  const GAS_URL =
    "https://script.google.com/macros/s/AKfycbx6Kvcbk5h_qQ1n-7yxw_UEUJltOGKtiMxwJH1kAfxharYcdV0GPi0W1oLZFCu_GOZA1Q/exec";

  const SYNC_QUEUE_KEY = "genka_sync_queue_v3";
  const DEVICE_ID_KEY = "genka_device_id_v1";

  const today = () => new Date().toISOString().slice(0, 10);

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

  const fmtMonthJa = (v) => {
    if (!v) return "-";
    const [y, m] = String(v).split("-");
    return `${y}年${m}月`;
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

  const [screen, setScreen] = useState(() => {
    const navEntry = performance.getEntriesByType("navigation")[0];
    const isReload = navEntry?.type === "reload";
    if (isReload) return sessionStorage.getItem("screen") || "site";
    return "site";
  });

  useEffect(() => {
    sessionStorage.setItem("screen", screen);
  }, [screen]);

  const [message, setMessage] = useState("");
  const [syncing, setSyncing] = useState(false);

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
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState("");

  const notify = (text) => {
    setMessage(text);
    window.clearTimeout(window.__genka_msg_timer__);
    window.__genka_msg_timer__ = window.setTimeout(() => setMessage(""), 1800);
  };

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

  const queueRecords = async (records) => {
    if (!Array.isArray(records) || !records.length) return;
    const prev = readQueue();
    const next = mergeQueueRows(prev, records);
    writeQueue(next);
    await flushQueue();
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

  const activeSites = useMemo(
    () => sites.filter((site) => site.status !== "deleted" && site.isActive !== false),
    [sites]
  );

  useEffect(() => {
    if (!selectedSiteId && activeSites[0]) {
      setSelectedSiteId(String(activeSites[0].id));
    }
  }, [selectedSiteId, activeSites]);

  const selectedSite = useMemo(
    () => activeSites.find((site) => String(site.id) === String(selectedSiteId)) || null,
    [activeSites, selectedSiteId]
  );

  const registeredCreators = useMemo(
    () => (selectedSite ? (siteCreatorsMap[String(selectedSite.id)] || []).map((x) => x.name ?? x) : []),
    [selectedSite, siteCreatorsMap]
  );

  const currentWorkLogs = useMemo(
    () =>
      selectedSite
        ? workLogs
            .filter((log) => String(log.siteId) === String(selectedSite.id) && log.status !== "deleted")
            .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))
        : [],
    [selectedSite, workLogs]
  );

  const currentMaterials = useMemo(
    () =>
      selectedSite
        ? materials
            .filter((item) => String(item.siteId) === String(selectedSite.id) && item.status !== "deleted")
            .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))
        : [],
    [selectedSite, materials]
  );

  const filteredWorkLogs = useMemo(
    () => currentWorkLogs.filter((log) => !commonCreator || log.creator === commonCreator),
    [currentWorkLogs, commonCreator]
  );

  const filteredMaterials = useMemo(
    () => currentMaterials.filter((item) => !commonCreator || item.creator === commonCreator),
    [currentMaterials, commonCreator]
  );

  const selectedSiteCreators = useMemo(
    () => (selectedSite ? registeredCreators : []),
    [selectedSite, registeredCreators]
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

  const creatorCards = useMemo(() => {
    if (!selectedSite) return [];
    return (siteCreatorsMap[String(selectedSite.id)] || []).map((item) => {
      const name = item.name ?? item;
      const works = currentWorkLogs.filter((log) => log.creator === name);
      const mats = currentMaterials.filter((mat) => mat.creator === name);
      return {
        name,
        workHoursTotal: works.reduce((sum, log) => sum + Number(log.hours || 0), 0),
        materialQtyTotal: mats.reduce((sum, mat) => sum + Number(mat.qty || 0), 0),
      };
    });
  }, [selectedSite, siteCreatorsMap, currentWorkLogs, currentMaterials]);

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

  const invoiceTotal = useMemo(
    () => Number(serverInvoiceTotals.total_amount || 0),
    [serverInvoiceTotals]
  );

  const workInvoiceTotal = useMemo(
    () => Number(serverInvoiceTotals.work_amount || 0),
    [serverInvoiceTotals]
  );

  const materialInvoiceTotal = useMemo(
    () => Number(serverInvoiceTotals.material_amount || 0),
    [serverInvoiceTotals]
  );

  const resetSiteForm = () => {
    setSiteName("");
    setSitePerson(managerNameOptions[0] || "");
    setEditingSiteId("");
  };

  const resetWorkForm = () => {
    setWorkDate(today());
    setWorkHours("");
    setEditingWorkId("");
  };

  const resetMaterialForm = () => {
    setMaterialDate(today());
    setMaterialName(materialNameOptions[0] || "");
    setMaterialThickness("");
    setMaterialSize("");
    setMaterialQty("");
    setEditingMaterialId("");
  };

  function movePrev() {
    const order = ["site", "creator", "work", "invoice"];
    const idx = order.indexOf(screen);
    if (idx > 0) setScreen(order[idx - 1]);
  }

  function moveNext() {
    const order = ["site", "creator", "work", "invoice"];
    const idx = order.indexOf(screen);
    if (screen === "site" && !selectedSite) return notify("先に現場を選んでください");
    if (screen === "creator" && (!selectedSite || registeredCreators.length === 0))
      return notify("先に制作者を登録してください");
    if (idx < order.length - 1) setScreen(order[idx + 1]);
  }

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

  async function handleRegisterCreator() {
    if (!selectedSite) {
      notify("先に現場を選んでください");
      return;
    }

    const trimmed = String(newCreatorName || "").trim();
    if (!trimmed) {
      notify("制作者を選択してください");
      return;
    }

    const current = siteCreatorsMap[String(selectedSite.id)] || [];
    const names = current.map((x) => x.name ?? x);
    if (names.includes(trimmed)) {
      notify("この制作者は登録済みです");
      return;
    }

    const creatorRecordId = makeId("site_creator");
    const createdAt = nowIso();

    setSiteCreatorsMap((prev) => ({
      ...prev,
      [String(selectedSite.id)]: [
        ...(prev[String(selectedSite.id)] || []),
        {
          name: trimmed,
          recordId: creatorRecordId,
          createdAt,
          updatedAt: createdAt,
        },
      ],
    }));

    setCommonCreator(trimmed);
    setNewCreatorName(workerNameOptions[0] || "");

    await queueRecords([
      toSiteCreatorGasRecord({
        siteId: selectedSite.id,
        siteName: selectedSite.name,
        manager: selectedSite.person,
        creator: trimmed,
        recordId: creatorRecordId,
        createdAt,
        updatedAt: createdAt,
      }),
    ]);

    notify("制作者を登録しました");
  }

  async function handleSaveSite() {
    const trimmed = siteName.trim();
    if (!trimmed) {
      notify("現場名を入力してください");
      return;
    }

    if (editingSiteId) {
      const current = sites.find((site) => String(site.id) === String(editingSiteId));
      if (!current) return notify("現場が見つかりません");

      const updated = {
        ...current,
        name: trimmed,
        person: sitePerson,
        updatedAt: nowIso(),
      };

      setSites((prev) =>
        prev.map((site) => (String(site.id) === String(editingSiteId) ? updated : site))
      );

      await queueRecords([toSiteGasRecord(updated)]);
      resetSiteForm();
      notify("現場を更新しました");
      return;
    }

    const id = makeId("site");
    const localSite = {
      id,
      recordId: makeId("site_rec"),
      name: trimmed,
      person: sitePerson,
      isActive: true,
      status: "active",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    setSites((prev) => [localSite, ...prev]);
    setSelectedSiteId(id);

    await queueRecords([toSiteGasRecord(localSite)]);
    resetSiteForm();
    notify("現場を登録しました");
  }

  function handleEditSite(siteId) {
    const target = sites.find((site) => String(site.id) === String(siteId));
    if (!target) return;
    setEditingSiteId(String(siteId));
    setSiteName(target.name);
    setSitePerson(target.person);
    setScreen("site");
    notify("現場を編集中です");
  }

  async function handleSaveWork() {
    if (!selectedSite) return notify("先に現場を選んでください");
    if (!String(workHours).trim()) return notify("作業時間を入力してください");
    if (!commonCreator) return notify("制作者を選んでください");

    const hours = Number(workHours || 0);
    if (!hours) return notify("作業時間を入力してください");

    if (editingWorkId) {
      const current = workLogs.find((log) => String(log.id) === String(editingWorkId));
      if (!current) return notify("編集対象が見つかりません");

      const updated = {
        ...current,
        date: workDate,
        creator: commonCreator,
        hours,
        updatedAt: nowIso(),
      };

      setWorkLogs((prev) =>
        prev.map((log) => (String(log.id) === String(editingWorkId) ? updated : log))
      );

      await queueRecords([toWorkGasRecord(updated, selectedSite)]);
      await fetchInvoiceSummary();
      resetWorkForm();
      notify("作業を更新しました");
      return;
    }

    const localRecord = {
      id: makeId("work"),
      siteId: String(selectedSite.id),
      date: workDate,
      creator: commonCreator,
      hours,
      status: "active",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    setWorkLogs((prev) => [localRecord, ...prev]);
    await queueRecords([toWorkGasRecord(localRecord, selectedSite)]);
    await fetchInvoiceSummary();
    resetWorkForm();
    notify("作業を追加しました");
  }

  async function handleSaveMaterial() {
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
      const current = materials.find((item) => String(item.id) === String(editingMaterialId));
      if (!current) return notify("編集対象が見つかりません");

      const updated = {
        ...current,
        date: materialDate,
        creator: commonCreator,
        name: materialName,
        thickness: materialThickness,
        size: materialSize,
        qty,
        unitPrice: Number(master?.unit_price || 0),
        materialId: master?.id || "",
        updatedAt: nowIso(),
      };

      setMaterials((prev) =>
        prev.map((item) => (String(item.id) === String(editingMaterialId) ? updated : item))
      );

      await queueRecords([toMaterialGasRecord(updated, selectedSite)]);
      await fetchInvoiceSummary();
      resetMaterialForm();
      notify("材料を更新しました");
      return;
    }

    const localRecord = {
      id: makeId("material"),
      siteId: String(selectedSite.id),
      date: materialDate,
      creator: commonCreator,
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
    resetMaterialForm();
    notify("材料を追加しました");
  }

  function handleEditWork(logId) {
    const target = workLogs.find((log) => String(log.id) === String(logId));
    if (!target) return;
    setEditingMaterialId("");
    setEditingWorkId(String(target.id));
    setCommonCreator(target.creator);
    setWorkDate(target.date);
    setWorkHours(String(target.hours || ""));
    notify("作業を編集中です");
  }

  async function handleDeleteWork(logId) {
    const target = workLogs.find((log) => String(log.id) === String(logId));
    if (!target) return;

    const updated = { ...target, status: "deleted", updatedAt: nowIso() };
    setWorkLogs((prev) =>
      prev.map((log) => (String(log.id) === String(logId) ? updated : log))
    );

    if (String(editingWorkId) === String(logId)) resetWorkForm();

    await queueRecords([toWorkGasRecord(updated, selectedSite)]);
    await fetchInvoiceSummary();
    notify("作業を削除しました");
  }

  function handleEditMaterial(itemId) {
    const target = materials.find((item) => String(item.id) === String(itemId));
    if (!target) return;
    setEditingWorkId("");
    setEditingMaterialId(String(target.id));
    setCommonCreator(target.creator);
    setMaterialDate(target.date);
    setMaterialName(target.name);
    setMaterialThickness(target.thickness || "");
    setMaterialSize(target.size);
    setMaterialQty(String(target.qty || ""));
    notify("材料を編集中です");
  }

  async function handleDeleteMaterial(itemId) {
    const target = materials.find((item) => String(item.id) === String(itemId));
    if (!target) return;

    const updated = { ...target, status: "deleted", updatedAt: nowIso() };
    setMaterials((prev) =>
      prev.map((item) => (String(item.id) === String(itemId) ? updated : item))
    );

    if (String(editingMaterialId) === String(itemId)) resetMaterialForm();

    await queueRecords([toMaterialGasRecord(updated, selectedSite)]);
    await fetchInvoiceSummary();
    notify("材料を削除しました");
  }

  const pageWrap = {
    maxWidth: 1180,
    margin: "0 auto",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", padding: 16 }}>
      <div style={pageWrap}>
        <Card style={{ marginBottom: 16, padding: "12px 16px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "52px 1fr 52px",
              alignItems: "center",
              gap: 12,
            }}
          >
            <button
              type="button"
              onClick={movePrev}
              disabled={screen === "site"}
              style={{
                height: 52,
                width: 52,
                borderRadius: 18,
                border: "none",
                fontSize: 28,
                fontWeight: 700,
                cursor: screen === "site" ? "default" : "pointer",
                background: screen === "site" ? "#e2e8f0" : "#0f172a",
                color: screen === "site" ? "#94a3b8" : "#ffffff",
              }}
            >
              ←
            </button>

            <div style={{ textAlign: "center", fontSize: 14, fontWeight: 700, color: "#475569" }}>
              {message || " "}
            </div>

            <button
              type="button"
              onClick={moveNext}
              disabled={
                (screen === "site" && !selectedSite) ||
                (screen === "creator" && (!selectedSite || registeredCreators.length === 0)) ||
                screen === "invoice"
              }
              style={{
                height: 52,
                width: 52,
                borderRadius: 18,
                border: "none",
                fontSize: 28,
                fontWeight: 700,
                cursor:
                  (screen === "site" && !selectedSite) ||
                  (screen === "creator" && (!selectedSite || registeredCreators.length === 0)) ||
                  screen === "invoice"
                    ? "default"
                    : "pointer",
                background:
                  (screen === "site" && !selectedSite) ||
                  (screen === "creator" && (!selectedSite || registeredCreators.length === 0)) ||
                  screen === "invoice"
                    ? "#e2e8f0"
                    : "#0f172a",
                color:
                  (screen === "site" && !selectedSite) ||
                  (screen === "creator" && (!selectedSite || registeredCreators.length === 0)) ||
                  screen === "invoice"
                    ? "#94a3b8"
                    : "#ffffff",
              }}
            >
              →
            </button>
          </div>
        </Card>

        {screen === "site" && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 4, fontSize: 13, color: "#64748b" }}>画面1</div>
              <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, color: "#0f172a" }}>
                現場登録
              </h1>
              <p style={{ marginTop: 6, fontSize: 14, color: "#64748b" }}>
                現場名と担当者を登録し、一覧から制作者選択へ進みます。
              </p>
            </div>

            <Card style={{ marginBottom: 16, padding: 20 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 220px 160px",
                  gap: 16,
                  alignItems: "end",
                }}
              >
                <div>
                  <Label>現場名</Label>
                  <TextField
                    value={siteName}
                    onChange={setSiteName}
                    placeholder="例：東京大丸夜間工事"
                  />
                </div>

                <div>
                  <Label>担当者</Label>
                  <SelectField
                    value={sitePerson}
                    options={managerNameOptions.length ? managerNameOptions : [""]}
                    onChange={setSitePerson}
                  />
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  {editingSiteId ? (
                    <Button onClick={resetSiteForm}>編集をやめる</Button>
                  ) : null}
                  <Button primary onClick={handleSaveSite}>
                    {editingSiteId ? "現場を更新" : "現場を登録"}
                  </Button>
                </div>
              </div>
            </Card>

            <div style={{ marginBottom: 10, fontSize: 14, fontWeight: 700, color: "#334155" }}>
              登録済み現場
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              {activeSites.length === 0 ? (
                <Card style={{ padding: 20, fontSize: 14, color: "#64748b" }}>
                  登録済み現場はありません
                </Card>
              ) : (
                activeSites.map((site) => {
                  const siteWorks = workLogs.filter(
                    (log) => String(log.siteId) === String(site.id) && log.status !== "deleted"
                  );
                  const siteMaterials = materials.filter(
                    (item) => String(item.siteId) === String(site.id) && item.status !== "deleted"
                  );

                  return (
                    <Card key={site.id} style={{ padding: 16 }}>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 260px",
                          gap: 16,
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
                            {site.name}
                          </div>
                          <div style={{ marginTop: 4, fontSize: 13, color: "#64748b" }}>
                            担当者：{site.person}
                          </div>
                          <div
                            style={{
                              marginTop: 10,
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 8,
                              fontSize: 11,
                            }}
                          >
                            <span
                              style={{
                                borderRadius: 999,
                                background: "#e0f2fe",
                                padding: "6px 10px",
                                color: "#334155",
                              }}
                            >
                              作業 {siteWorks.length}件
                            </span>
                            <span
                              style={{
                                borderRadius: 999,
                                background: "#dcfce7",
                                padding: "6px 10px",
                                color: "#334155",
                              }}
                            >
                              材料 {siteMaterials.length}件
                            </span>
                            <span
                              style={{
                                borderRadius: 999,
                                background: "#e2e8f0",
                                padding: "6px 10px",
                                color: "#334155",
                              }}
                            >
                              {fmtMonthJa(site.createdAt)}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                          <Button onClick={() => handleEditSite(site.id)}>編集</Button>
                          <Button
                            onClick={() => {
                              setSelectedSiteId(String(site.id));
                              setScreen("creator");
                            }}
                          >
                            開く
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        )}

        {screen === "creator" && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 4, fontSize: 13, color: "#64748b" }}>画面2</div>
              <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, color: "#0f172a" }}>
                制作者選択
              </h1>
              <p style={{ marginTop: 6, fontSize: 14, color: "#64748b" }}>
                その現場で登録した制作者だけを表示し、選ぶとそのまま入力へ進めます。
              </p>
            </div>

            {selectedSite ? (
              <>
                <Card style={{ marginBottom: 16, padding: 20 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>
                    {selectedSite.name}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 14, color: "#64748b" }}>
                    担当者：{selectedSite.person}
                  </div>
                </Card>

                <Card style={{ marginBottom: 16, padding: 20 }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 170px",
                      gap: 16,
                      alignItems: "end",
                      marginBottom: 18,
                    }}
                  >
                    <div>
                      <Label>新規制作者登録</Label>
                      <SelectField
                        value={newCreatorName}
                        options={workerNameOptions.length ? workerNameOptions : [""]}
                        onChange={setNewCreatorName}
                      />
                    </div>
                    <Button primary onClick={handleRegisterCreator}>
                      制作者を登録
                    </Button>
                  </div>

                  <div style={{ marginBottom: 10, fontSize: 14, fontWeight: 700, color: "#334155" }}>
                    制作者を選ぶ
                  </div>

                  {registeredCreators.length === 0 ? (
                    <Card style={{ padding: 16, fontSize: 14, color: "#64748b" }}>
                      まだ制作者が登録されていません
                    </Card>
                  ) : (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                        gap: 12,
                      }}
                    >
                      {creatorCards.map((card) => {
                        const active = commonCreator === card.name;
                        return (
                          <button
                            key={card.name}
                            type="button"
                            onClick={() => {
                              setCommonCreator(card.name);
                              setScreen("work");
                            }}
                            style={{
                              borderRadius: 18,
                              border: active ? "1px solid #0f172a" : "1px solid #e2e8f0",
                              background: active ? "#0f172a" : "#ffffff",
                              color: active ? "#ffffff" : "#334155",
                              padding: 16,
                              textAlign: "left",
                              cursor: "pointer",
                              boxShadow: "0 1px 2px rgba(15,23,42,0.06)",
                            }}
                          >
                            <div style={{ fontSize: 15, fontWeight: 700 }}>{card.name}</div>
                            <div
                              style={{
                                marginTop: 8,
                                fontSize: 12,
                                color: active ? "#cbd5e1" : "#64748b",
                              }}
                            >
                              作業 {fmt(card.workHoursTotal)}h / 材料 {fmt(card.materialQtyTotal)}枚
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </Card>
              </>
            ) : (
              <Card style={{ padding: 20, fontSize: 14, color: "#64748b" }}>
                先に現場を選んでください。
              </Card>
            )}
          </div>
        )}

        {screen === "work" && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 4, fontSize: 13, color: "#64748b" }}>画面3</div>
              <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, color: "#0f172a" }}>
                現場別作業登録
              </h1>
              <p style={{ marginTop: 6, fontSize: 14, color: "#64748b" }}>
                制作者を先に選んでから、作業と材料を登録する流れです。
              </p>
            </div>

            {selectedSite ? (
              <>
                <Card style={{ marginBottom: 16, padding: 20 }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 180px",
                      gap: 16,
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>
                        {selectedSite.name}
                      </div>
                      <div style={{ marginTop: 6, fontSize: 14, color: "#64748b" }}>
                        担当者：{selectedSite.person}
                      </div>
                      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <span
                          style={{
                            borderRadius: 999,
                            background: "#e2e8f0",
                            padding: "6px 10px",
                            fontSize: 11,
                            color: "#334155",
                          }}
                        >
                          制作者：{commonCreator || "-"}
                        </span>
                      </div>
                    </div>

                    <div>
                      <Label>対象月</Label>
                      <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        style={{
                          height: 48,
                          width: "100%",
                          borderRadius: 16,
                          border: "1px solid #e2e8f0",
                          background: "#ffffff",
                          padding: "0 14px",
                          fontSize: 14,
                          color: "#334155",
                          outline: "none",
                        }}
                      />
                    </div>
                  </div>
                </Card>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 16,
                    marginBottom: 16,
                  }}
                >
                  <Card
                    id="work-form"
                    style={{
                      padding: 20,
                      border: "1px solid #bae6fd",
                      background: "rgba(14,165,233,0.06)",
                    }}
                  >
                    <div
                      style={{
                        marginBottom: 16,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
                        作業追加
                      </div>
                      {editingWorkId ? (
                        <div
                          style={{
                            borderRadius: 999,
                            border: "1px solid #bae6fd",
                            background: "#ffffff",
                            padding: "6px 10px",
                            fontSize: 11,
                            color: "#334155",
                          }}
                        >
                          編集中
                        </div>
                      ) : null}
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 16,
                      }}
                    >
                      <div>
                        <Label>日付</Label>
                        <DateField value={workDate} onChange={setWorkDate} />
                      </div>

                      <div>
                        <Label>作業時間</Label>
                        <NumberField
                          value={workHours}
                          onChange={setWorkHours}
                          step="0.1"
                          placeholder="例：4.5"
                        />
                      </div>
                    </div>

                    <div style={{ marginTop: 16 }}>
                      <Label>制作者</Label>
                      <SelectField
                        value={commonCreator}
                        options={selectedSiteCreators.length ? selectedSiteCreators : [""]}
                        onChange={setCommonCreator}
                      />
                    </div>

                    <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 8 }}>
                      {editingWorkId ? (
                        <Button onClick={resetWorkForm}>編集をやめる</Button>
                      ) : null}
                      <Button primary onClick={handleSaveWork}>
                        {editingWorkId ? "作業を更新" : "作業を追加"}
                      </Button>
                    </div>
                  </Card>

                  <Card
                    id="material-form"
                    style={{
                      padding: 20,
                      border: "1px solid #bbf7d0",
                      background: "rgba(34,197,94,0.05)",
                    }}
                  >
                    <div
                      style={{
                        marginBottom: 16,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
                        材料追加
                      </div>
                      {editingMaterialId ? (
                        <div
                          style={{
                            borderRadius: 999,
                            border: "1px solid #bbf7d0",
                            background: "#ffffff",
                            padding: "6px 10px",
                            fontSize: 11,
                            color: "#334155",
                          }}
                        >
                          編集中
                        </div>
                      ) : null}
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 16,
                      }}
                    >
                      <div>
                        <Label>日付</Label>
                        <DateField value={materialDate} onChange={setMaterialDate} />
                      </div>

                      <div>
                        <Label>材料</Label>
                        <SelectField
                          value={materialName}
                          options={materialNameOptions.length ? materialNameOptions : [""]}
                          onChange={(value) => {
                            setMaterialName(value);
                            setMaterialThickness("");
                            setMaterialSize("");
                          }}
                        />
                      </div>

                      <div>
                        <Label>厚み</Label>
                        <SelectField
                          value={materialThickness}
                          options={materialThicknessOptions.length ? materialThicknessOptions : [""]}
                          onChange={(value) => {
                            setMaterialThickness(value);
                            setMaterialSize("");
                          }}
                        />
                      </div>

                      <div>
                        <Label>サイズ</Label>
                        <SelectField
                          value={materialSize}
                          options={materialSizeOptions.length ? materialSizeOptions : [""]}
                          onChange={setMaterialSize}
                        />
                      </div>

                      <div>
                        <Label>枚数</Label>
                        <NumberField
                          value={materialQty}
                          onChange={setMaterialQty}
                          step="0.1"
                          placeholder="例：2.0"
                        />
                      </div>
                    </div>

                    <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 8 }}>
                      {editingMaterialId ? (
                        <Button onClick={resetMaterialForm}>編集をやめる</Button>
                      ) : null}
                      <Button primary onClick={handleSaveMaterial}>
                        {editingMaterialId ? "材料を更新" : "材料を追加"}
                      </Button>
                    </div>
                  </Card>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 16,
                    marginBottom: 16,
                  }}
                >
                  <div>
                    <div
                      style={{
                        marginBottom: 10,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                        追加済み作業
                      </div>
                      <div
                        style={{
                          borderRadius: 999,
                          background: "#e0f2fe",
                          padding: "6px 10px",
                          fontSize: 11,
                          color: "#334155",
                        }}
                      >
                        一覧
                      </div>
                    </div>

                    <div style={{ display: "grid", gap: 8 }}>
                      {filteredWorkLogs.length === 0 ? (
                        <Card style={{ padding: 16, fontSize: 14, color: "#64748b" }}>
                          この制作者の作業登録はまだありません
                        </Card>
                      ) : (
                        filteredWorkLogs.map((log) => (
                          <Card
                            key={log.id}
                            style={{
                              padding: 12,
                              border: "1px solid #bae6fd",
                              background: "rgba(14,165,233,0.05)",
                            }}
                          >
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "120px 1fr 90px auto",
                                gap: 8,
                                alignItems: "center",
                                fontSize: 12,
                              }}
                            >
                              <div style={{ fontWeight: 600, color: "#334155" }}>
                                {fmtDate(log.date)}
                              </div>
                              <div style={{ color: "#334155" }}>{log.creator}</div>
                              <div style={{ textAlign: "right", fontWeight: 700, color: "#0f172a" }}>
                                {fmt(log.hours)}h
                              </div>
                              <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                                <SmallButton onClick={() => handleEditWork(log.id)}>編集</SmallButton>
                                <SmallButton danger onClick={() => handleDeleteWork(log.id)}>
                                  削除
                                </SmallButton>
                              </div>
                            </div>
                          </Card>
                        ))
                      )}
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        marginBottom: 10,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                        追加済み材料
                      </div>
                      <div
                        style={{
                          borderRadius: 999,
                          background: "#dcfce7",
                          padding: "6px 10px",
                          fontSize: 11,
                          color: "#334155",
                        }}
                      >
                        一覧
                      </div>
                    </div>

                    <div style={{ display: "grid", gap: 8 }}>
                      {filteredMaterials.length === 0 ? (
                        <Card style={{ padding: 16, fontSize: 14, color: "#64748b" }}>
                          この制作者の材料登録はまだありません
                        </Card>
                      ) : (
                        filteredMaterials.map((item) => (
                          <Card
                            key={item.id}
                            style={{
                              padding: 12,
                              border: "1px solid #bbf7d0",
                              background: "rgba(34,197,94,0.05)",
                            }}
                          >
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "120px 1fr 90px auto",
                                gap: 8,
                                alignItems: "center",
                                fontSize: 12,
                              }}
                            >
                              <div style={{ fontWeight: 600, color: "#334155" }}>
                                {fmtDate(item.date)}
                              </div>
                              <div style={{ color: "#334155" }}>
                                {item.name} / {item.thickness} / {item.size}
                              </div>
                              <div style={{ textAlign: "right", fontWeight: 700, color: "#0f172a" }}>
                                {fmt(item.qty)}枚
                              </div>
                              <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                                <SmallButton onClick={() => handleEditMaterial(item.id)}>
                                  編集
                                </SmallButton>
                                <SmallButton danger onClick={() => handleDeleteMaterial(item.id)}>
                                  削除
                                </SmallButton>
                              </div>
                            </div>
                          </Card>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <Button primary onClick={() => setScreen("site")} style={{ minWidth: 220 }}>
                    完了して戻る
                  </Button>
                </div>
              </>
            ) : (
              <Card style={{ padding: 20, fontSize: 14, color: "#64748b" }}>
                先に現場を登録してください。
              </Card>
            )}
          </div>
        )}

        {screen === "invoice" && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 4, fontSize: 13, color: "#64748b" }}>画面4</div>
              <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, color: "#0f172a" }}>
                請求書・集計
              </h1>
              <p style={{ marginTop: 6, fontSize: 14, color: "#64748b" }}>
                月別の請求集計を確認し、CSV出力や印刷ができます。
              </p>
            </div>

            <Card style={{ padding: 20, marginBottom: 16 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "180px 1fr",
                  gap: 16,
                  alignItems: "end",
                }}
              >
                <div>
                  <Label>月選択</Label>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    style={{
                      height: 48,
                      width: "100%",
                      borderRadius: 16,
                      border: "1px solid #e2e8f0",
                      background: "#ffffff",
                      padding: "0 14px",
                      fontSize: 14,
                      color: "#334155",
                      outline: "none",
                    }}
                  />
                </div>

                <div style={{ display: "flex", gap: 10, alignItems: "end" }}>
                  <Button onClick={exportInvoiceCsv}>CSV出力</Button>
                  <Button dark onClick={() => window.print()}>
                    A3印刷
                  </Button>
                  <Button onClick={() => setScreen("work")}>作業画面へ戻る</Button>
                </div>
              </div>

              {invoiceLoading ? (
                <div style={{ marginTop: 12, fontSize: 13, color: "#64748b" }}>
                  請求金額を読込中...
                </div>
              ) : null}

              {invoiceError ? (
                <div style={{ marginTop: 12, fontSize: 13, color: "#dc2626" }}>
                  {invoiceError}
                </div>
              ) : null}
            </Card>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 16,
                marginBottom: 16,
              }}
            >
              <Card style={{ padding: 20 }}>
                <div style={{ fontSize: 12, color: "#64748b" }}>作業請求額</div>
                <div style={{ marginTop: 8, fontSize: 24, fontWeight: 800, color: "#0f172a" }}>
                  {fmt(workInvoiceTotal)}円
                </div>
              </Card>

              <Card style={{ padding: 20 }}>
                <div style={{ fontSize: 12, color: "#64748b" }}>材料費合計</div>
                <div style={{ marginTop: 8, fontSize: 24, fontWeight: 800, color: "#0f172a" }}>
                  {fmt(materialInvoiceTotal)}円
                </div>
              </Card>

              <Card style={{ padding: 20 }}>
                <div style={{ fontSize: 12, color: "#64748b" }}>請求額</div>
                <div style={{ marginTop: 8, fontSize: 24, fontWeight: 800, color: "#0f172a" }}>
                  {fmt(invoiceTotal)}円
                </div>
              </Card>
            </div>

            <Card style={{ padding: 20 }}>
              <div style={{ marginBottom: 12, fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                請求一覧
              </div>

              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    minWidth: 900,
                  }}
                >
                  <thead>
                    <tr>
                      {[
                        "現場名",
                        "担当者",
                        "制作者",
                        "作業時間",
                        "材料枚数",
                        "作業請求",
                        "材料請求",
                        "請求金額",
                      ].map((label) => (
                        <th
                          key={label}
                          style={{
                            padding: "12px 10px",
                            borderBottom: "1px solid #e2e8f0",
                            textAlign: "left",
                            fontSize: 12,
                            color: "#64748b",
                            background: "#f8fafc",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayInvoiceRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          style={{
                            padding: "16px 10px",
                            fontSize: 14,
                            color: "#64748b",
                          }}
                        >
                          対象データがありません
                        </td>
                      </tr>
                    ) : (
                      displayInvoiceRows.map((row) => (
                        <tr key={`${row.siteId}_${row.creator}`}>
                          <td style={{ padding: "14px 10px", borderBottom: "1px solid #e2e8f0", fontSize: 14 }}>
                            {row.siteName}
                          </td>
                          <td style={{ padding: "14px 10px", borderBottom: "1px solid #e2e8f0", fontSize: 14 }}>
                            {row.manager}
                          </td>
                          <td style={{ padding: "14px 10px", borderBottom: "1px solid #e2e8f0", fontSize: 14 }}>
                            {row.creator}
                          </td>
                          <td style={{ padding: "14px 10px", borderBottom: "1px solid #e2e8f0", fontSize: 14 }}>
                            {fmt(row.workHoursTotal)}
                          </td>
                          <td style={{ padding: "14px 10px", borderBottom: "1px solid #e2e8f0", fontSize: 14 }}>
                            {fmt(row.materialQtyTotal)}
                          </td>
                          <td style={{ padding: "14px 10px", borderBottom: "1px solid #e2e8f0", fontSize: 14 }}>
                            {fmt(row.workAmount)}円
                          </td>
                          <td style={{ padding: "14px 10px", borderBottom: "1px solid #e2e8f0", fontSize: 14 }}>
                            {fmt(row.materialAmount)}円
                          </td>
                          <td
                            style={{
                              padding: "14px 10px",
                              borderBottom: "1px solid #e2e8f0",
                              fontSize: 14,
                              fontWeight: 800,
                            }}
                          >
                            {fmt(row.total)}円
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}