import React, { useEffect, useMemo, useState } from "react";

const APP_VERSION = "v2.9.2-materials-master";
const STORAGE_KEY = "genka-app-mobile-ui-v290";
const GAS_URL = "https://script.google.com/macros/s/AKfycbx6Kvcbk5h_qQ1n-7yxw_UEUJltOGKtiMxwJH1kAfxharYcdV0GPi0W1oLZFCu_GOZA1Q/exec";
const OVERHEAD = 1.35;
const BASE_HOURLY = 2300;
const FUJISHIMA_HOURLY = 2000;

const workers = ["中畑", "伴", "谷上", "藤島", "堀江", "佐藤幸三"];
const managers = ["工藤", "片野", "髙橋", "山野寺", "金子", "こうだい", "マナト"];

const fallbackMaterialOptions = [
  {
    name: "ラワンランバー",
    thicknesses: [
      { thickness: "12t", sizes: [{ size: "3×6", unitPrice: 2040 }, { size: "4×8", unitPrice: 2720 }] },
      { thickness: "15t", sizes: [{ size: "3×6", unitPrice: 2600 }, { size: "4×8", unitPrice: 3460 }] },
      { thickness: "18t", sizes: [{ size: "3×6", unitPrice: 3200 }, { size: "4×8", unitPrice: 4260 }] },
    ],
  },
  {
    name: "シナランバー",
    thicknesses: [
      { thickness: "15t", sizes: [{ size: "3×6", unitPrice: 3100 }, { size: "4×8", unitPrice: 4150 }] },
      { thickness: "18t", sizes: [{ size: "3×6", unitPrice: 3800 }, { size: "4×8", unitPrice: 5070 }] },
    ],
  },
  {
    name: "ポリ板",
    thicknesses: [
      { thickness: "2.5t", sizes: [{ size: "3×6", unitPrice: 1700 }, { size: "4×8", unitPrice: 2260 }] },
      { thickness: "3.0t", sizes: [{ size: "3×6", unitPrice: 1900 }, { size: "4×8", unitPrice: 2520 }] },
    ],
  },
];

function buildMaterialOptionsFromRows(rows) {
  const activeRows = Array.isArray(rows)
    ? rows.filter((r) => {
        const activeValue = String(r.is_active ?? r.status ?? "TRUE").toLowerCase();
        return activeValue !== "false" && activeValue !== "deleted";
      })
    : [];

  const nameMap = new Map();

  activeRows.forEach((r) => {
    const name = String(r.name || r.material_name || "").trim();
    const thickness = String(r.thickness || r.material_thickness || "").trim();
    const size = String(r.size || r.material_size || "").trim();
    if (!name || !thickness || !size) return;

    const unitPrice = Number(r.unit_price || r.price || r.unitPrice || 0);
    const materialId = String(r.id || r.material_id || "").trim();
    const fullName = String(r.full_name || r.fullName || `${name} ${thickness} ${size}`).trim();

    if (!nameMap.has(name)) {
      nameMap.set(name, { name, thicknesses: [] });
    }

    const material = nameMap.get(name);
    let thicknessGroup = material.thicknesses.find((t) => t.thickness === thickness);
    if (!thicknessGroup) {
      thicknessGroup = { thickness, sizes: [] };
      material.thicknesses.push(thicknessGroup);
    }

    if (!thicknessGroup.sizes.some((x) => x.size === size && x.unitPrice === unitPrice && x.materialId === materialId)) {
      thicknessGroup.sizes.push({ size, unitPrice, materialId, fullName });
    }
  });

  return Array.from(nameMap.values())
    .map((m) => ({
      ...m,
      thicknesses: m.thicknesses
        .map((t) => ({
          ...t,
          sizes: t.sizes.sort((a, b) => String(a.size).localeCompare(String(b.size), "ja")),
        }))
        .sort((a, b) => String(a.thickness).localeCompare(String(b.thickness), "ja")),
    }))
    .sort((a, b) => String(a.name).localeCompare(String(b.name), "ja"));
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function monthValue() {
  return new Date().toISOString().slice(0, 7);
}

function yearValue() {
  return String(new Date().getFullYear());
}

function makeId(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("ja-JP");
}

function formatMoney(value) {
  return `${Number(Math.round(value || 0)).toLocaleString("ja-JP")}円`;
}

function toMonthLabel(v) {
  if (!v) return "";
  const [y, m] = v.split("-");
  return `${y}年${Number(m)}月`;
}

function getHourlyRate(name) {
  return name === "藤島" ? FUJISHIMA_HOURLY : BASE_HOURLY;
}

function nowIso() {
  return new Date().toISOString();
}

function getDeviceId() {
  const key = "genka-device-id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = makeId("device");
    localStorage.setItem(key, id);
  }
  return id;
}

function emptyRecord(base) {
  const now = nowIso();
  return {
    record_id: base.record_id || "",
    entity_type: base.entity_type || "",
    site_id: base.site_id || "",
    site_name: base.site_name || "",
    manager: base.manager || "",
    creator: base.creator || "",
    work_date: base.work_date || "",
    material_date: base.material_date || "",
    hours: base.hours || "",
    material_id: base.material_id || "",
    material_name: base.material_name || "",
    material_thickness: base.material_thickness || "",
    material_size: base.material_size || "",
    qty: base.qty || "",
    unit_price: base.unit_price || "",
    status: base.status || "active",
    created_at: base.created_at || now,
    updated_at: now,
    device_id: getDeviceId(),
    updated_by: base.updated_by || "app",
  };
}

async function postToGas(record) {
  const url = import.meta.env.DEV ? "/gas" : GAS_URL;
  try {
    await fetch(url, {
      method: "POST",
      mode: import.meta.env.DEV ? "cors" : "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(record),
    });
    return true;
  } catch (error) {
    console.error("GAS送信エラー", error, record);
    return false;
  }
}

function downloadTextFile(filename, content, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  const [screen, setScreen] = useState("site");
  const [sites, setSites] = useState([]);
  const [siteCreatorsMap, setSiteCreatorsMap] = useState({});
  const [workLogs, setWorkLogs] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [materialOptions, setMaterialOptions] = useState(fallbackMaterialOptions);
  const [isMasterLoading, setIsMasterLoading] = useState(false);

  const [siteName, setSiteName] = useState("");
  const [sitePerson, setSitePerson] = useState(managers[0]);
  const [editingSiteId, setEditingSiteId] = useState(null);

  const [selectedSiteId, setSelectedSiteId] = useState(null);
  const [selectedCreator, setSelectedCreator] = useState("");
  const [newCreatorName, setNewCreatorName] = useState(workers[0]);

  const [targetMonth, setTargetMonth] = useState(monthValue());
  const [workDate, setWorkDate] = useState(today());
  const [workHours, setWorkHours] = useState("");
  const [editingWorkId, setEditingWorkId] = useState(null);

  const [materialDate, setMaterialDate] = useState(today());
  const [materialName, setMaterialName] = useState(fallbackMaterialOptions[0].name);
  const [materialThickness, setMaterialThickness] = useState(fallbackMaterialOptions[0].thicknesses[0].thickness);
  const [materialSize, setMaterialSize] = useState(fallbackMaterialOptions[0].thicknesses[0].sizes[0].size);
  const [materialQty, setMaterialQty] = useState("");
  const [editingMaterialId, setEditingMaterialId] = useState(null);

  const [invoiceViewMode, setInvoiceViewMode] = useState("month");
  const [selectedMonth, setSelectedMonth] = useState(monthValue());
  const [selectedYear, setSelectedYear] = useState(yearValue());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      setSites(Array.isArray(data.sites) ? data.sites : []);
      setSiteCreatorsMap(data.siteCreatorsMap || {});
      setWorkLogs(Array.isArray(data.workLogs) ? data.workLogs : []);
      setMaterials(Array.isArray(data.materials) ? data.materials : []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchBootstrap() {
      setIsMasterLoading(true);
      try {
        const url = import.meta.env.DEV ? "/gas" : GAS_URL;
        const res = await fetch(url);
        const data = await res.json();
        if (cancelled) return;

        const rows = data.materials || data.masters?.materials || [];
        const nextOptions = buildMaterialOptionsFromRows(rows);

        if (nextOptions.length > 0) {
          setMaterialOptions(nextOptions);
          setMaterialName((current) => nextOptions.some((m) => m.name === current) ? current : nextOptions[0].name);
        }
      } catch (error) {
        console.error("材料マスタ取得エラー", error);
      } finally {
        if (!cancelled) setIsMasterLoading(false);
      }
    }

    fetchBootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ sites, siteCreatorsMap, workLogs, materials }));
  }, [sites, siteCreatorsMap, workLogs, materials]);

  const selectedSite = useMemo(
    () => sites.find((s) => s.id === selectedSiteId) || null,
    [sites, selectedSiteId]
  );

  const thicknessOptions = useMemo(() => {
    return materialOptions.find((m) => m.name === materialName)?.thicknesses || [];
  }, [materialName]);

  const sizeOptions = useMemo(() => {
    return thicknessOptions.find((t) => t.thickness === materialThickness)?.sizes || [];
  }, [thicknessOptions, materialThickness]);

  useEffect(() => {
    const first = thicknessOptions[0];
    if (!first) return;
    if (!thicknessOptions.some((t) => t.thickness === materialThickness)) {
      setMaterialThickness(first.thickness);
      setMaterialSize(first.sizes[0]?.size || "");
    }
  }, [thicknessOptions, materialThickness]);

  useEffect(() => {
    const found = thicknessOptions.find((t) => t.thickness === materialThickness);
    if (!found) return;
    if (!found.sizes.some((s) => s.size === materialSize)) {
      setMaterialSize(found.sizes[0]?.size || "");
    }
  }, [materialThickness, thicknessOptions, materialSize]);

  const selectedMonthWorkLogs = useMemo(() => {
    if (!selectedSite || !selectedCreator) return [];
    return workLogs.filter(
      (x) => x.siteId === selectedSite.id && x.creator === selectedCreator && (x.date || "").slice(0, 7) === targetMonth
    );
  }, [workLogs, selectedSite, selectedCreator, targetMonth]);

  const selectedMonthMaterials = useMemo(() => {
    if (!selectedSite || !selectedCreator) return [];
    return materials.filter(
      (x) => x.siteId === selectedSite.id && x.creator === selectedCreator && (x.date || "").slice(0, 7) === targetMonth
    );
  }, [materials, selectedSite, selectedCreator, targetMonth]);

  const monthWorkHoursTotal = selectedMonthWorkLogs.reduce((sum, x) => sum + Number(x.hours || 0), 0);
  const monthMaterialQtyTotal = selectedMonthMaterials.reduce((sum, x) => sum + Number(x.qty || 0), 0);

  const siteSummaries = useMemo(() => {
    return sites.map((site) => {
      const ownWorks = workLogs.filter((x) => x.siteId === site.id);
      const ownMaterials = materials.filter((x) => x.siteId === site.id);
      const months = [...new Set([...ownWorks.map((x) => (x.date || "").slice(0, 7)), ...ownMaterials.map((x) => (x.date || "").slice(0, 7))].filter(Boolean))];
      return {
        ...site,
        workCount: ownWorks.length,
        materialCount: ownMaterials.length,
        latestMonth: months.sort().reverse()[0] || "-",
      };
    });
  }, [sites, workLogs, materials]);

  const creatorCards = useMemo(() => {
    if (!selectedSite) return [];
    const creators = siteCreatorsMap[selectedSite.id] || [];
    return creators.map((creator) => {
      const ownWorks = workLogs.filter((x) => x.siteId === selectedSite.id && x.creator === creator);
      const ownMaterials = materials.filter((x) => x.siteId === selectedSite.id && x.creator === creator);
      return {
        creator,
        workHoursTotal: ownWorks.reduce((sum, x) => sum + Number(x.hours || 0), 0),
        workCount: ownWorks.length,
        materialQtyTotal: ownMaterials.reduce((sum, x) => sum + Number(x.qty || 0), 0),
        materialCount: ownMaterials.length,
      };
    });
  }, [selectedSite, siteCreatorsMap, workLogs, materials]);

  const invoiceRows = useMemo(() => {
    const rowMap = {};

    sites.forEach((site) => {
      (siteCreatorsMap[site.id] || []).forEach((creator) => {
        rowMap[`${site.id}__${creator}`] = {
          siteId: site.id,
          siteName: site.name,
          manager: site.person,
          creator,
          workHoursTotal: 0,
          workCount: 0,
          materialQtyTotal: 0,
          materialCount: 0,
          workAmount: 0,
          materialAmount: 0,
          total: 0,
        };
      });
    });

    workLogs.forEach((x) => {
      const date = x.date || "";
      const hit = invoiceViewMode === "month" ? date.slice(0, 7) === selectedMonth : date.slice(0, 4) === selectedYear;
      if (!hit) return;
      const site = sites.find((s) => s.id === x.siteId);
      const key = `${x.siteId}__${x.creator}`;
      if (!rowMap[key]) {
        rowMap[key] = {
          siteId: x.siteId,
          siteName: site?.name || "",
          manager: site?.person || "",
          creator: x.creator,
          workHoursTotal: 0,
          workCount: 0,
          materialQtyTotal: 0,
          materialCount: 0,
          workAmount: 0,
          materialAmount: 0,
          total: 0,
        };
      }
      rowMap[key].workHoursTotal += Number(x.hours || 0);
      rowMap[key].workCount += 1;
      rowMap[key].workAmount += Number(x.hours || 0) * getHourlyRate(x.creator) * OVERHEAD;
    });

    materials.forEach((x) => {
      const date = x.date || "";
      const hit = invoiceViewMode === "month" ? date.slice(0, 7) === selectedMonth : date.slice(0, 4) === selectedYear;
      if (!hit) return;
      const site = sites.find((s) => s.id === x.siteId);
      const key = `${x.siteId}__${x.creator}`;
      if (!rowMap[key]) {
        rowMap[key] = {
          siteId: x.siteId,
          siteName: site?.name || "",
          manager: site?.person || "",
          creator: x.creator,
          workHoursTotal: 0,
          workCount: 0,
          materialQtyTotal: 0,
          materialCount: 0,
          workAmount: 0,
          materialAmount: 0,
          total: 0,
        };
      }
      rowMap[key].materialQtyTotal += Number(x.qty || 0);
      rowMap[key].materialCount += 1;
      rowMap[key].materialAmount += Number(x.qty || 0) * Number(x.unitPrice || 0) * OVERHEAD;
    });

    return Object.values(rowMap)
      .map((row) => ({ ...row, total: row.workAmount + row.materialAmount }))
      .filter((row) => row.workCount > 0 || row.materialCount > 0 || (siteCreatorsMap[row.siteId] || []).includes(row.creator))
      .sort((a, b) => (a.siteName !== b.siteName ? a.siteName.localeCompare(b.siteName, "ja") : a.creator.localeCompare(b.creator, "ja")));
  }, [sites, siteCreatorsMap, workLogs, materials, invoiceViewMode, selectedMonth, selectedYear]);

  const invoiceTotalWork = invoiceRows.reduce((sum, x) => sum + x.workAmount, 0);
  const invoiceTotalMaterial = invoiceRows.reduce((sum, x) => sum + x.materialAmount, 0);
  const invoiceTotal = invoiceRows.reduce((sum, x) => sum + x.total, 0);

  const selectedMaterialSizeOption = () => sizeOptions.find((x) => x.size === materialSize) || null;
  const getUnitPrice = () => Number(selectedMaterialSizeOption()?.unitPrice || 0);
  const getMaterialId = () => selectedMaterialSizeOption()?.materialId || "";
  const notify = (msg) => window.alert(msg);

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

  const resetSiteForm = () => {
    setSiteName("");
    setSitePerson(managers[0]);
    setEditingSiteId(null);
  };

  const saveSite = async () => {
    if (!siteName.trim()) return notify("現場名を入力してください");

    if (editingSiteId) {
      const updatedSite = { id: editingSiteId, name: siteName.trim(), person: sitePerson, isActive: true, createdAt: today() };
      setSites((prev) => prev.map((s) => (s.id === editingSiteId ? { ...s, name: updatedSite.name, person: updatedSite.person } : s)));
      await postToGas(emptyRecord({ record_id: editingSiteId, entity_type: "site", site_id: editingSiteId, site_name: updatedSite.name, manager: updatedSite.person }));
      resetSiteForm();
      notify("現場を更新しました");
      return;
    }

    const newSite = {
      id: makeId("site"),
      name: siteName.trim(),
      person: sitePerson,
      isActive: true,
      createdAt: today(),
    };
    setSites((prev) => [newSite, ...prev]);
    setSiteCreatorsMap((prev) => ({ ...prev, [newSite.id]: [] }));
    await postToGas(emptyRecord({ record_id: newSite.id, entity_type: "site", site_id: newSite.id, site_name: newSite.name, manager: newSite.person, created_at: newSite.createdAt }));
    resetSiteForm();
    notify("現場を登録しました");
  };

  const editSite = (site) => {
    setEditingSiteId(site.id);
    setSiteName(site.name);
    setSitePerson(site.person);
    setScreen("site");
  };

  const openSite = (site) => {
    setSelectedSiteId(site.id);
    const creators = siteCreatorsMap[site.id] || [];
    setSelectedCreator(creators[0] || "");
    setScreen("creator");
  };

  const deleteSite = async (site) => {
    if (!window.confirm(`現場「${site.name}」を削除しますか？\nこの現場の作業・材料・制作者もアプリ上から削除されます。`)) return;

    const relatedWorks = workLogs.filter((x) => x.siteId === site.id);
    const relatedMaterials = materials.filter((x) => x.siteId === site.id);
    const relatedCreators = siteCreatorsMap[site.id] || [];

    setSites((prev) => prev.filter((s) => s.id !== site.id));
    setWorkLogs((prev) => prev.filter((x) => x.siteId !== site.id));
    setMaterials((prev) => prev.filter((x) => x.siteId !== site.id));
    setSiteCreatorsMap((prev) => {
      const next = { ...prev };
      delete next[site.id];
      return next;
    });

    if (selectedSiteId === site.id) {
      setSelectedSiteId(null);
      setSelectedCreator("");
      setScreen("site");
    }
    if (editingSiteId === site.id) resetSiteForm();

    const records = [
      emptyRecord({ record_id: site.id, entity_type: "site", site_id: site.id, site_name: site.name, manager: site.person, status: "deleted" }),
      ...relatedCreators.map((creator) =>
        emptyRecord({ record_id: `site_creator_${site.id}_${creator}`, entity_type: "site_creator", site_id: site.id, site_name: site.name, manager: site.person, creator, status: "deleted" })
      ),
      ...relatedWorks.map((x) =>
        emptyRecord({ record_id: x.id, entity_type: "work", site_id: site.id, site_name: site.name, manager: site.person, creator: x.creator, work_date: x.date, hours: x.hours, status: "deleted" })
      ),
      ...relatedMaterials.map((x) =>
        emptyRecord({ record_id: x.id, entity_type: "material", site_id: site.id, site_name: site.name, manager: site.person, creator: x.creator, material_date: x.date, material_id: x.materialId || "", material_name: x.name, material_thickness: x.thickness, material_size: x.size, qty: x.qty, unit_price: x.unitPrice, status: "deleted" })
      ),
    ];

    await Promise.all(records.map((record) => postToGas(record)));
    notify("現場を削除しました");
  };

  const deleteCreator = async (creatorName) => {
    if (!selectedSite) return notify("先に現場を選んでください");
    if (!window.confirm(`制作者「${creatorName}」をこの現場から削除しますか？\n作業・材料の履歴は残します。`)) return;

    setSiteCreatorsMap((prev) => ({
      ...prev,
      [selectedSite.id]: (prev[selectedSite.id] || []).filter((name) => name !== creatorName),
    }));

    if (selectedCreator === creatorName) {
      const nextCreator = (siteCreatorsMap[selectedSite.id] || []).find((name) => name !== creatorName) || "";
      setSelectedCreator(nextCreator);
    }

    await postToGas(emptyRecord({
      record_id: `site_creator_${selectedSite.id}_${creatorName}`,
      entity_type: "site_creator",
      site_id: selectedSite.id,
      site_name: selectedSite.name,
      manager: selectedSite.person,
      creator: creatorName,
      status: "deleted",
    }));
    notify("制作者を削除しました");
  };

  const addCreator = async () => {
    if (!selectedSite) return notify("先に現場を選んでください");
    const current = siteCreatorsMap[selectedSite.id] || [];
    if (current.includes(newCreatorName)) return notify("この制作者は登録済みです");
    setSiteCreatorsMap((prev) => ({ ...prev, [selectedSite.id]: [...(prev[selectedSite.id] || []), newCreatorName] }));
    setSelectedCreator(newCreatorName);
    await postToGas(emptyRecord({ record_id: `site_creator_${selectedSite.id}_${newCreatorName}`, entity_type: "site_creator", site_id: selectedSite.id, site_name: selectedSite.name, manager: selectedSite.person, creator: newCreatorName }));
    notify("制作者を登録しました");
  };

  const clearWorkForm = () => {
    setWorkDate(today());
    setWorkHours("");
    setEditingWorkId(null);
  };

  const saveWork = async () => {
    if (!selectedSite) return notify("先に現場を選んでください");
    if (!selectedCreator) return notify("先に制作者を選んでください");
    if (!workHours) return notify("作業時間を入力してください");

    const row = {
      id: editingWorkId || makeId("work"),
      siteId: selectedSite.id,
      date: workDate,
      creator: selectedCreator,
      hours: String(workHours),
    };

    const record = emptyRecord({ record_id: row.id, entity_type: "work", site_id: selectedSite.id, site_name: selectedSite.name, manager: selectedSite.person, creator: selectedCreator, work_date: workDate, hours: String(workHours) });

    if (editingWorkId) {
      setWorkLogs((prev) => prev.map((x) => (x.id === editingWorkId ? row : x)));
      await postToGas(record);
      clearWorkForm();
      notify("作業を更新しました");
      return;
    }
    setWorkLogs((prev) => [row, ...prev]);
    await postToGas(record);
    clearWorkForm();
    notify("作業を追加しました");
  };

  const editWork = (row) => {
    setEditingWorkId(row.id);
    setWorkDate(row.date);
    setWorkHours(row.hours);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteWork = async (id) => {
    if (!window.confirm("この作業を削除しますか？")) return;
    const target = workLogs.find((x) => x.id === id);
    setWorkLogs((prev) => prev.filter((x) => x.id !== id));
    if (target && selectedSite) {
      await postToGas(emptyRecord({ record_id: id, entity_type: "work", site_id: selectedSite.id, site_name: selectedSite.name, manager: selectedSite.person, creator: target.creator, work_date: target.date, hours: target.hours, status: "deleted" }));
    }
    if (editingWorkId === id) clearWorkForm();
  };

  const clearMaterialForm = () => {
    setMaterialDate(today());
    setMaterialQty("");
    setEditingMaterialId(null);
  };

  const saveMaterial = async () => {
    if (!selectedSite) return notify("先に現場を選んでください");
    if (!selectedCreator) return notify("先に制作者を選んでください");
    if (!materialQty) return notify("材料枚数を入力してください");

    const row = {
      id: editingMaterialId || makeId("material"),
      siteId: selectedSite.id,
      date: materialDate,
      creator: selectedCreator,
      name: materialName,
      thickness: materialThickness,
      size: materialSize,
      qty: String(materialQty),
      unitPrice: getUnitPrice(),
      materialId: getMaterialId(),
    };

    const record = emptyRecord({ record_id: row.id, entity_type: "material", site_id: selectedSite.id, site_name: selectedSite.name, manager: selectedSite.person, creator: selectedCreator, material_date: materialDate, material_id: getMaterialId(), material_name: materialName, material_thickness: materialThickness, material_size: materialSize, qty: String(materialQty), unit_price: getUnitPrice() });

    if (editingMaterialId) {
      setMaterials((prev) => prev.map((x) => (x.id === editingMaterialId ? row : x)));
      await postToGas(record);
      clearMaterialForm();
      notify("材料を更新しました");
      return;
    }
    setMaterials((prev) => [row, ...prev]);
    await postToGas(record);
    clearMaterialForm();
    notify("材料を追加しました");
  };

  const editMaterial = (row) => {
    setEditingMaterialId(row.id);
    setMaterialDate(row.date);
    setMaterialName(row.name);
    setMaterialThickness(row.thickness);
    setMaterialSize(row.size);
    setMaterialQty(row.qty);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteMaterial = async (id) => {
    if (!window.confirm("この材料を削除しますか？")) return;
    const target = materials.find((x) => x.id === id);
    setMaterials((prev) => prev.filter((x) => x.id !== id));
    if (target && selectedSite) {
      await postToGas(emptyRecord({ record_id: id, entity_type: "material", site_id: selectedSite.id, site_name: selectedSite.name, manager: selectedSite.person, creator: target.creator, material_date: target.date, material_id: target.materialId || "", material_name: target.name, material_thickness: target.thickness, material_size: target.size, qty: target.qty, unit_price: target.unitPrice, status: "deleted" }));
    }
    if (editingMaterialId === id) clearMaterialForm();
  };

  const exportInvoiceCsv = () => {
    const target = invoiceViewMode === "month" ? selectedMonth : selectedYear;
    const header = ["集計区分", "対象期間", "現場名", "担当者", "制作者", "作業時間", "作業件数", "材料枚数", "材料件数", "作業請求", "材料請求", "請求金額"];
    const rows = invoiceRows.map((r) => [
      invoiceViewMode === "month" ? "月次" : "年次",
      target,
      r.siteName,
      r.manager,
      r.creator,
      r.workHoursTotal,
      r.workCount,
      r.materialQtyTotal,
      r.materialCount,
      Math.round(r.workAmount),
      Math.round(r.materialAmount),
      Math.round(r.total),
    ]);
    const csv = [header, ...rows].map((row) => row.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    downloadTextFile(`請求集計_${target}.csv`, `\uFEFF${csv}`, "text/csv;charset=utf-8");
  };

  return (
    <div className="app-shell">
      <style>{globalCss}</style>
      <div className="version-badge">{APP_VERSION}</div>

      <div className="app-page">
        <div className="top-nav">
          <button className="nav-btn" onClick={goPrev} disabled={screen === "site"}>←</button>
          <button className="nav-btn" onClick={goNext} disabled={screen === "invoice"}>→</button>
        </div>

        {screen === "site" && (
          <>
            <h1 className="page-title">現場登録</h1>
            <section className="card">
              <div className="field-grid">
                <div>
                  <label className="label">現場名</label>
                  <input className="input" value={siteName} onChange={(e) => setSiteName(e.target.value)} placeholder="現場名を入力" />
                </div>
                <div>
                  <label className="label">担当者</label>
                  <select className="input" value={sitePerson} onChange={(e) => setSitePerson(e.target.value)}>
                    {managers.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div className="button-row">
                <button className="primary" onClick={saveSite}>{editingSiteId ? "現場を更新" : "現場を登録"}</button>
                {editingSiteId && <button className="ghost" onClick={resetSiteForm}>キャンセル</button>}
              </div>
            </section>

            <section className="card">
              <h2 className="section-title">登録済み現場</h2>
              <div className="list-stack">
                {siteSummaries.length === 0 && <div className="empty">まだ現場がありません</div>}
                {siteSummaries.map((site) => (
                  <div key={site.id} className="site-item">
                    <div className="site-line">
                      {site.name} / {site.person} / 作業{site.workCount}件 / 材料{site.materialCount}件 / 作成月{site.latestMonth === "-" ? "-" : toMonthLabel(site.latestMonth)}
                    </div>
                    <div className="mini-buttons">
                      <button className="mini ghost" onClick={() => editSite(site)}>編集</button>
                      <button className="mini danger" onClick={() => deleteSite(site)}>削除</button>
                      <button className="mini dark" onClick={() => openSite(site)}>開く</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {screen === "creator" && (
          <>
            <h1 className="page-title">制作者選択</h1>
            <section className="card">
              <div className="big-site-name">{selectedSite?.name || "現場未選択"}</div>
              <div className="site-meta">担当者：{selectedSite?.person || "-"}</div>
            </section>

            <section className="card">
              <label className="label">新規制作者登録</label>
              <div className="field-grid compact">
                <select className="input" value={newCreatorName} onChange={(e) => setNewCreatorName(e.target.value)}>
                  {workers.map((w) => <option key={w} value={w}>{w}</option>)}
                </select>
                <button className="primary" onClick={addCreator}>制作者を登録</button>
              </div>

              <label className="label mt">制作者を選ぶ</label>
              <div className="creator-grid">
                {creatorCards.length === 0 && <div className="empty">まだ制作者がいません</div>}
                {creatorCards.map((x) => (
                  <div key={x.creator} className={`creator-card ${selectedCreator === x.creator ? "active" : ""}`}>
                    <button className="creator-card-main" onClick={() => { setSelectedCreator(x.creator); setScreen("work"); }}>
                      <strong>{x.creator}</strong>
                      <span>作業{x.workCount}件 / {formatNumber(x.workHoursTotal)}時間</span>
                      <span>材料{x.materialCount}件 / {formatNumber(x.materialQtyTotal)}枚</span>
                    </button>
                    <div className="mini-buttons creator-actions">
                      <button className="mini ghost" onClick={() => { setSelectedCreator(x.creator); setScreen("work"); }}>選択</button>
                      <button className="mini danger" onClick={() => deleteCreator(x.creator)}>削除</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {screen === "work" && (
          <>
            <h1 className="page-title">現場別作業登録</h1>
            <section className="card compact-card">
              <div className="work-header">
                <div>
                  <div className="big-site-name">{selectedSite?.name || "-"}</div>
                  <div className="site-meta">担当者：{selectedSite?.person || "-"}</div>
                  <div className="pill">制作者：{selectedCreator || "-"}</div>
                </div>
                <div className="month-box">
                  <label className="label">対象月</label>
                  <input className="input" type="month" value={targetMonth} onChange={(e) => setTargetMonth(e.target.value)} />
                </div>
              </div>
              <div className="kpi-row">
                <span>作業{selectedMonthWorkLogs.length}件 / {formatNumber(monthWorkHoursTotal)}時間</span>
                <span>材料{selectedMonthMaterials.length}件 / {formatNumber(monthMaterialQtyTotal)}枚</span>
              </div>
            </section>

            <div className="two-column">
              <section className={`panel blue ${editingWorkId ? "editing" : ""}`}>
                <h2 className="panel-title">作業追加</h2>
                <div className="inline-row">
                  <label>日付</label>
                  <input className="compact-input date-input" type="date" value={workDate} onChange={(e) => setWorkDate(e.target.value)} />
                </div>
                <div className="inline-row">
                  <label>時間</label>
                  <input className="compact-input" type="number" step="0.5" value={workHours} onChange={(e) => setWorkHours(e.target.value)} placeholder="例：4" />
                </div>
                <div className="inline-row">
                  <label>制作者</label>
                  <input className="compact-input" value={selectedCreator || ""} readOnly />
                </div>
                <button className="primary small" onClick={saveWork}>{editingWorkId ? "作業を更新" : "作業を追加"}</button>
              </section>

              <section className={`panel green ${editingMaterialId ? "editing" : ""}`}>
                <h2 className="panel-title">材料追加</h2>
                {isMasterLoading && <div className="master-loading">材料マスタ読込中...</div>}
                <div className="inline-row">
                  <label>日付</label>
                  <input className="compact-input date-input" type="date" value={materialDate} onChange={(e) => setMaterialDate(e.target.value)} />
                </div>
                <div className="inline-row">
                  <label>材質</label>
                  <select className="compact-input" value={materialName} onChange={(e) => setMaterialName(e.target.value)}>
                    {materialOptions.map((m) => <option key={m.name} value={m.name}>{m.name}</option>)}
                  </select>
                </div>
                <div className="grid-2">
                  <div>
                    <label>厚み</label>
                    <select className="compact-input" value={materialThickness} onChange={(e) => setMaterialThickness(e.target.value)}>
                      {thicknessOptions.map((t) => <option key={t.thickness} value={t.thickness}>{t.thickness}</option>)}
                    </select>
                  </div>
                  <div>
                    <label>サイズ</label>
                    <select className="compact-input" value={materialSize} onChange={(e) => setMaterialSize(e.target.value)}>
                      {sizeOptions.map((s) => <option key={s.size} value={s.size}>{s.size}</option>)}
                    </select>
                  </div>
                  <div>
                    <label>枚数</label>
                    <input className="compact-input" type="number" step="0.1" value={materialQty} onChange={(e) => setMaterialQty(e.target.value)} placeholder="例：2.0" />
                  </div>
                  <div>
                    <label>単価</label>
                    <input className="compact-input" value={formatNumber(getUnitPrice())} readOnly />
                  </div>
                </div>
                <button className="primary small" onClick={saveMaterial}>{editingMaterialId ? "材料を更新" : "材料を追加"}</button>
              </section>
            </div>

            <div className="two-column">
              <section className="card">
                <h2 className="section-title">追加済み作業</h2>
                {selectedMonthWorkLogs.length === 0 && <div className="empty">データなし</div>}
                {selectedMonthWorkLogs.map((x) => (
                  <div key={x.id} className="record-item">
                    <div className="record-text"><strong>{x.date}</strong><span>{x.creator}</span><span>{x.hours}時間</span></div>
                    <div className="mini-buttons"><button className="mini ghost" onClick={() => editWork(x)}>編集</button><button className="mini danger" onClick={() => deleteWork(x.id)}>削除</button></div>
                  </div>
                ))}
              </section>

              <section className="card">
                <h2 className="section-title">追加済み材料</h2>
                {selectedMonthMaterials.length === 0 && <div className="empty">データなし</div>}
                {selectedMonthMaterials.map((x) => (
                  <div key={x.id} className="record-item">
                    <div className="record-text"><strong>{x.date}</strong><span>{x.name}</span><span>{x.thickness} / {x.size}</span><span>{x.qty}枚</span></div>
                    <div className="mini-buttons"><button className="mini ghost" onClick={() => editMaterial(x)}>編集</button><button className="mini danger" onClick={() => deleteMaterial(x.id)}>削除</button></div>
                  </div>
                ))}
              </section>
            </div>

            <button className="primary wide" onClick={() => setScreen("creator")}>完了して戻る</button>
          </>
        )}

        {screen === "invoice" && (
          <>
            <h1 className="page-title">請求書・集計</h1>
            <section className="card">
              <label className="label">集計区分</label>
              <div className="segment-row">
                <button className={invoiceViewMode === "month" ? "segment active" : "segment"} onClick={() => setInvoiceViewMode("month")}>月次</button>
                <button className={invoiceViewMode === "year" ? "segment active" : "segment"} onClick={() => setInvoiceViewMode("year")}>年次</button>
              </div>
              <label className="label mt">{invoiceViewMode === "month" ? "月選択" : "年選択"}</label>
              <div className="action-row">
                {invoiceViewMode === "month" ? (
                  <input className="input" type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
                ) : (
                  <input className="input" type="number" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} />
                )}
                <button className="ghost" onClick={exportInvoiceCsv}>CSV出力</button>
                <button className="dark-btn" onClick={() => window.print()}>A3印刷</button>
                <button className="ghost" onClick={() => setScreen("work")}>作業画面へ</button>
              </div>
            </section>

            <div className="summary-grid">
              <div className="summary-card"><span>作業請求額</span><strong>{formatMoney(invoiceTotalWork)}</strong></div>
              <div className="summary-card"><span>材料請求額</span><strong>{formatMoney(invoiceTotalMaterial)}</strong></div>
              <div className="summary-card"><span>請求合計</span><strong>{formatMoney(invoiceTotal)}</strong></div>
            </div>

            <section className="card">
              <h2 className="section-title">請求一覧</h2>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>現場名</th><th>担当者</th><th>制作者</th><th>作業時間</th><th>材料枚数</th><th>作業請求</th><th>材料請求</th><th>請求額</th></tr>
                  </thead>
                  <tbody>
                    {invoiceRows.length === 0 && <tr><td colSpan={8} className="td-empty">データがありません</td></tr>}
                    {invoiceRows.map((row) => (
                      <tr key={`${row.siteId}_${row.creator}`}>
                        <td>{row.siteName}</td><td>{row.manager}</td><td>{row.creator}</td><td className="num">{formatNumber(row.workHoursTotal)}</td><td className="num">{formatNumber(row.materialQtyTotal)}</td><td className="num">{formatMoney(row.workAmount)}</td><td className="num">{formatMoney(row.materialAmount)}</td><td className="num bold">{formatMoney(row.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

const globalCss = `
  * { box-sizing: border-box; }
  html, body, #root { margin: 0; padding: 0; width: 100%; min-height: 100%; overflow-x: hidden; font-family: "Hiragino Sans", "Yu Gothic", "Meiryo", sans-serif; background: #f4f7fb; color: #08133e; }
  button, input, select { font: inherit; }
  button { cursor: pointer; }
  button:disabled { opacity: .35; cursor: default; }

  .app-shell { min-height: 100vh; background: #f4f7fb; padding: 14px 10px 60px; overflow-x: hidden; }
  .version-badge { position: fixed; top: 6px; left: 8px; z-index: 9999; font-size: 11px; color: #777; background: rgba(255,255,255,.9); border: 1px solid #dde3ee; border-radius: 8px; padding: 2px 7px; }
  .app-page { width: 100%; max-width: 980px; margin: 0 auto; background: #eef2f7; border: 1px solid #e2e8f1; border-radius: 16px; padding: 6px; overflow-x: hidden; }
  .top-nav { display: flex; justify-content: space-between; align-items: center; background: #fff; border-radius: 18px; padding: 10px; margin-bottom: 14px; box-shadow: 0 4px 14px rgba(17,24,39,.05); }
  .nav-btn { width: 34px; height: 34px; border: 0; border-radius: 11px; background: #08133e; color: #fff; font-size: 14px; font-weight: 900; padding: 0; flex: 0 0 34px; }
  .page-title { margin: 0 0 10px; font-size: clamp(18px, 4.4vw, 30px); line-height: 1.2; color: #08133e; }
  .card, .panel { width: 100%; min-width: 0; border-radius: 20px; padding: 14px; margin-bottom: 12px; border: 1px solid #e2e8f2; box-shadow: 0 5px 14px rgba(17,24,39,.045); overflow: hidden; }
  .card { background: #fff; }
  .panel.blue { background: #f2f7ff; border-color: #dce9fb; }
  .panel.green { background: #f4fbf4; border-color: #dcf0dc; }
  .editing { box-shadow: 0 0 0 2px #87b8ff inset; }
  .section-title, .panel-title { margin: 0 0 12px; font-size: 17px; font-weight: 900; color: #08133e; }
  .master-loading { margin: -4px 0 8px; font-size: 12px; font-weight: 800; color: #6b7690; }
  .label, .inline-row label, .grid-2 label { display: block; font-size: 13px; font-weight: 800; color: #68748e; margin-bottom: 6px; white-space: nowrap; }
  .field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .field-grid.compact { align-items: end; }
  .input, .compact-input { display: block; width: 100%; max-width: 100%; min-width: 0; border: 1px solid #cfd8e7; background: #fff; color: #08133e; outline: none; box-shadow: none; }
  .input { height: 44px; border-radius: 14px; padding: 0 12px; font-size: 14px; }
  .compact-input { height: 40px; border-radius: 13px; padding: 0 9px; font-size: 13px; }
  input[type="date"], input[type="month"] { -webkit-appearance: none; appearance: none; letter-spacing: -.03em; padding-left: 6px !important; padding-right: 4px !important; text-align: center; }
  .date-input { font-size: 12px !important; }
  .button-row, .action-row, .segment-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-top: 12px; }
  .primary, .ghost, .dark-btn, .segment { height: 40px; border-radius: 13px; padding: 0 14px; font-size: 13px; font-weight: 900; white-space: nowrap; }
  .primary { border: 0; background: #3e66e5; color: #fff; }
  .primary.small { height: 38px; margin-top: 10px; }
  .primary.wide { width: 100%; max-width: 350px; display: block; margin: 4px auto 0; }
  .ghost { border: 1px solid #d7deea; background: #fff; color: #08133e; }
  .dark-btn, .segment.active { border: 0; background: #08133e; color: #fff; }
  .segment { border: 1px solid #d7deea; background: #fff; color: #08133e; }
  .list-stack { display: flex; flex-direction: column; gap: 9px; }
  .empty { color: #8d97ad; padding: 8px 0; font-size: 13px; }
  .site-item, .record-item { display: flex; align-items: center; justify-content: space-between; gap: 8px; border: 1px solid #e0e6f0; border-radius: 15px; padding: 10px; background: #fff; min-width: 0; }
  .site-line { flex: 1; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-size: 12.5px; font-weight: 800; }
  .mini-buttons { display: flex; gap: 6px; flex: 0 0 auto; }
  .mini { height: 34px; border-radius: 10px; padding: 0 11px; font-size: 12px; font-weight: 900; }
  .mini.dark { border: 0; background: #08133e; color: #fff; }
  .mini.danger { border: 0; background: #ef5350; color: #fff; }
  .big-site-name { font-size: clamp(19px, 4.2vw, 28px); line-height: 1.15; font-weight: 900; color: #08133e; word-break: break-word; }
  .site-meta { margin-top: 5px; font-size: 14px; color: #7a859d; }
  .mt { margin-top: 16px; }
  .creator-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 10px; margin-top: 8px; }
  .creator-card { min-width: 0; min-height: 82px; border-radius: 16px; padding: 10px; text-align: left; border: 1px solid #dce2ef; background: #fff; color: #08133e; box-shadow: 0 4px 12px rgba(17,24,39,.04); }
  .creator-card.active { background: #08133e; color: #fff; border-color: #08133e; }
  .creator-card-main { display: block; width: 100%; min-width: 0; padding: 0; margin: 0; border: 0; background: transparent; color: inherit; text-align: left; }
  .creator-card strong, .creator-card span { display: block; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .creator-card strong { font-size: 15px; margin-bottom: 6px; }
  .creator-card span { font-size: 12px; line-height: 1.35; }
  .creator-actions { margin-top: 9px; justify-content: flex-end; }
  .work-header { display: grid; grid-template-columns: minmax(0, 1fr) 180px; gap: 10px; align-items: end; }
  .month-box { min-width: 0; }
  .pill { display: inline-flex; margin-top: 8px; padding: 7px 12px; border-radius: 999px; background: #eef2f8; color: #5d6881; font-size: 12px; font-weight: 800; }
  .kpi-row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
  .kpi-row span { display: inline-flex; align-items: center; padding: 7px 11px; border-radius: 999px; background: #eef2f8; color: #4f5b75; font-size: 12.5px; font-weight: 900; }
  .two-column { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; min-width: 0; }
  .inline-row { display: grid; grid-template-columns: 42px minmax(0, 1fr); gap: 6px; align-items: center; margin-bottom: 8px; min-width: 0; }
  .inline-row label { margin-bottom: 0; font-size: 12.5px; }
  .grid-2 { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 8px; margin-top: 8px; min-width: 0; }
  .grid-2 > div { min-width: 0; }
  .record-text { flex: 1; display: flex; gap: 9px; align-items: center; flex-wrap: wrap; min-width: 0; }
  .record-text strong { font-size: 14px; color: #08133e; white-space: nowrap; }
  .record-text span { font-size: 13px; color: #5f6b85; white-space: nowrap; }
  .summary-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-bottom: 12px; }
  .summary-card { background: #fff; border: 1px solid #e4e8f2; border-radius: 18px; padding: 14px; box-shadow: 0 5px 14px rgba(17,24,39,.045); }
  .summary-card span { display: block; font-size: 12.5px; color: #7f8aa2; font-weight: 800; margin-bottom: 7px; }
  .summary-card strong { display: block; font-size: clamp(20px, 4vw, 34px); color: #08133e; word-break: break-word; }
  .table-wrap { width: 100%; overflow-x: auto; border: 1px solid #e5e9f2; border-radius: 14px; }
  table { width: 100%; min-width: 780px; border-collapse: collapse; background: #fff; }
  th, td { padding: 12px 10px; border-bottom: 1px solid #edf1f6; white-space: nowrap; font-size: 13px; }
  th { background: #f0f3f8; color: #7a849b; text-align: left; font-weight: 900; }
  td { color: #08133e; }
  .num { text-align: right; }
  .bold { font-weight: 900; }
  .td-empty { text-align: center; color: #8c96ad; padding: 18px; }

  @media (max-width: 768px) {
    .app-shell { padding: 10px 6px 50px; }
    .app-page { padding: 4px; border-radius: 14px; }
    .top-nav { padding: 8px; margin-bottom: 10px; }
    .nav-btn { width: 32px; height: 32px; flex-basis: 32px; }
    .page-title { font-size: 21px; margin-bottom: 8px; }
    .card, .panel { border-radius: 18px; padding: 11px; margin-bottom: 10px; }
    .field-grid, .two-column, .summary-grid, .work-header { grid-template-columns: 1fr; gap: 10px; }
    .action-row { flex-direction: column; align-items: stretch; }
    .action-row > * { width: 100%; }
    .site-item, .record-item { flex-direction: column; align-items: stretch; }
    .site-line { width: 100%; }
    .mini-buttons { justify-content: flex-end; }
    .inline-row { grid-template-columns: 38px minmax(0, 1fr); gap: 5px; }
    .inline-row label { font-size: 12px; }
    .compact-input { height: 38px; font-size: 12.5px; padding-left: 7px; padding-right: 5px; }
    .date-input { font-size: 11.5px !important; padding-left: 4px !important; padding-right: 2px !important; }
    .grid-2 { gap: 7px; }
    .section-title, .panel-title { font-size: 16px; margin-bottom: 10px; }
    .primary, .ghost, .dark-btn, .segment { height: 38px; font-size: 12.5px; }
    table { min-width: 720px; }
  }

  @media (max-width: 360px) {
    .inline-row { grid-template-columns: 34px minmax(0, 1fr); }
    .compact-input { font-size: 12px; padding-left: 5px; padding-right: 3px; }
    .date-input { font-size: 11px !important; }
    .card, .panel { padding: 10px; }
  }
`;
