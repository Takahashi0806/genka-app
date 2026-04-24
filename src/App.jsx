import React, { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "genka-app-mobile-fixed-v2";
const OVERHEAD = 1.35;
const BASE_HOURLY = 2300;
const FUJISHIMA_HOURLY = 2000;

const workers = ["中畑", "伴", "谷上", "藤島", "堀江", "佐藤幸三"];
const managers = ["工藤", "片野", "髙橋", "山野寺", "金子", "こうだい", "マナト"];

const materialOptions = [
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
  const [materialName, setMaterialName] = useState(materialOptions[0].name);
  const [materialThickness, setMaterialThickness] = useState(materialOptions[0].thicknesses[0].thickness);
  const [materialSize, setMaterialSize] = useState(materialOptions[0].thicknesses[0].sizes[0].size);
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
      setSites(data.sites || []);
      setSiteCreatorsMap(data.siteCreatorsMap || {});
      setWorkLogs(data.workLogs || []);
      setMaterials(data.materials || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    const data = { sites, siteCreatorsMap, workLogs, materials };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [sites, siteCreatorsMap, workLogs, materials]);

  const selectedSite = useMemo(
    () => sites.find((s) => s.id === selectedSiteId) || null,
    [sites, selectedSiteId]
  );

  const thicknessOptions = useMemo(() => {
    const found = materialOptions.find((m) => m.name === materialName);
    return found ? found.thicknesses : [];
  }, [materialName]);

  const sizeOptions = useMemo(() => {
    const foundThickness = thicknessOptions.find((t) => t.thickness === materialThickness);
    return foundThickness ? foundThickness.sizes : [];
  }, [thicknessOptions, materialThickness]);

  useEffect(() => {
    const firstThickness = thicknessOptions[0];
    if (!firstThickness) return;
    const exists = thicknessOptions.some((t) => t.thickness === materialThickness);
    if (!exists) {
      setMaterialThickness(firstThickness.thickness);
      setMaterialSize(firstThickness.sizes[0]?.size || "");
    }
  }, [thicknessOptions, materialThickness]);

  useEffect(() => {
    const foundThickness = thicknessOptions.find((t) => t.thickness === materialThickness);
    if (!foundThickness) return;
    const exists = foundThickness.sizes.some((s) => s.size === materialSize);
    if (!exists) {
      setMaterialSize(foundThickness.sizes[0]?.size || "");
    }
  }, [materialThickness, thicknessOptions, materialSize]);

  const selectedMonthWorkLogs = useMemo(() => {
    if (!selectedSite || !selectedCreator) return [];
    return workLogs.filter(
      (x) =>
        x.siteId === selectedSite.id &&
        x.creator === selectedCreator &&
        (x.date || "").slice(0, 7) === targetMonth
    );
  }, [workLogs, selectedSite, selectedCreator, targetMonth]);

  const selectedMonthMaterials = useMemo(() => {
    if (!selectedSite || !selectedCreator) return [];
    return materials.filter(
      (x) =>
        x.siteId === selectedSite.id &&
        x.creator === selectedCreator &&
        (x.date || "").slice(0, 7) === targetMonth
    );
  }, [materials, selectedSite, selectedCreator, targetMonth]);

  const monthWorkHoursTotal = useMemo(
    () => selectedMonthWorkLogs.reduce((sum, x) => sum + Number(x.hours || 0), 0),
    [selectedMonthWorkLogs]
  );

  const monthMaterialQtyTotal = useMemo(
    () => selectedMonthMaterials.reduce((sum, x) => sum + Number(x.qty || 0), 0),
    [selectedMonthMaterials]
  );

  const siteSummaries = useMemo(() => {
    return sites.map((site) => {
      const workCount = workLogs.filter((x) => x.siteId === site.id).length;
      const materialCount = materials.filter((x) => x.siteId === site.id).length;
      const months = [
        ...new Set(
          [
            ...workLogs.filter((x) => x.siteId === site.id).map((x) => (x.date || "").slice(0, 7)),
            ...materials.filter((x) => x.siteId === site.id).map((x) => (x.date || "").slice(0, 7)),
          ].filter(Boolean)
        ),
      ];

      return {
        ...site,
        workCount,
        materialCount,
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
      const creators = siteCreatorsMap[site.id] || [];
      creators.forEach((creator) => {
        const key = `${site.id}__${creator}`;
        rowMap[key] = {
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
      const key = `${x.siteId}__${x.creator}`;
      if (!rowMap[key]) {
        const site = sites.find((s) => s.id === x.siteId);
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
      const rate = getHourlyRate(x.creator);
      rowMap[key].workHoursTotal += Number(x.hours || 0);
      rowMap[key].workCount += 1;
      rowMap[key].workAmount += Number(x.hours || 0) * rate * OVERHEAD;
    });

    materials.forEach((x) => {
      const date = x.date || "";
      const hit = invoiceViewMode === "month" ? date.slice(0, 7) === selectedMonth : date.slice(0, 4) === selectedYear;
      if (!hit) return;
      const key = `${x.siteId}__${x.creator}`;
      if (!rowMap[key]) {
        const site = sites.find((s) => s.id === x.siteId);
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
      .map((row) => ({
        ...row,
        total: row.workAmount + row.materialAmount,
      }))
      .filter(
        (row) => row.workCount > 0 || row.materialCount > 0 || (siteCreatorsMap[row.siteId] || []).includes(row.creator)
      )
      .sort((a, b) => {
        if (a.siteName !== b.siteName) return a.siteName.localeCompare(b.siteName, "ja");
        return a.creator.localeCompare(b.creator, "ja");
      });
  }, [sites, siteCreatorsMap, workLogs, materials, invoiceViewMode, selectedMonth, selectedYear]);

  const invoiceTotalWork = invoiceRows.reduce((sum, x) => sum + x.workAmount, 0);
  const invoiceTotalMaterial = invoiceRows.reduce((sum, x) => sum + x.materialAmount, 0);
  const invoiceTotal = invoiceRows.reduce((sum, x) => sum + x.total, 0);

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

  const notify = (msg) => window.alert(msg);

  const resetSiteForm = () => {
    setSiteName("");
    setSitePerson(managers[0]);
    setEditingSiteId(null);
  };

  const saveSite = () => {
    if (!siteName.trim()) return notify("現場名を入力してください");

    if (editingSiteId) {
      setSites((prev) => prev.map((s) => (s.id === editingSiteId ? { ...s, name: siteName.trim(), person: sitePerson } : s)));
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

  const addCreator = () => {
    if (!selectedSite) return notify("先に現場を選んでください");
    const current = siteCreatorsMap[selectedSite.id] || [];
    if (current.includes(newCreatorName)) return notify("この制作者は登録済みです");
    setSiteCreatorsMap((prev) => ({
      ...prev,
      [selectedSite.id]: [...(prev[selectedSite.id] || []), newCreatorName],
    }));
    setSelectedCreator(newCreatorName);
    notify("制作者を登録しました");
  };

  const selectCreatorCard = (name) => {
    setSelectedCreator(name);
    setScreen("work");
  };

  const clearWorkForm = () => {
    setWorkDate(today());
    setWorkHours("");
    setEditingWorkId(null);
  };

  const saveWork = () => {
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

    if (editingWorkId) {
      setWorkLogs((prev) => prev.map((x) => (x.id === editingWorkId ? row : x)));
      clearWorkForm();
      notify("作業を更新しました");
      return;
    }

    setWorkLogs((prev) => [row, ...prev]);
    clearWorkForm();
    notify("作業を追加しました");
  };

  const editWork = (row) => {
    setEditingWorkId(row.id);
    setWorkDate(row.date);
    setWorkHours(row.hours);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteWork = (id) => {
    if (!window.confirm("この作業を削除しますか？")) return;
    setWorkLogs((prev) => prev.filter((x) => x.id !== id));
    if (editingWorkId === id) clearWorkForm();
  };

  const clearMaterialForm = () => {
    setMaterialDate(today());
    setMaterialQty("");
    setEditingMaterialId(null);
  };

  const getUnitPrice = () => {
    const found = sizeOptions.find((x) => x.size === materialSize);
    return found ? Number(found.unitPrice || 0) : 0;
  };

  const saveMaterial = () => {
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
    };

    if (editingMaterialId) {
      setMaterials((prev) => prev.map((x) => (x.id === editingMaterialId ? row : x)));
      clearMaterialForm();
      notify("材料を更新しました");
      return;
    }

    setMaterials((prev) => [row, ...prev]);
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

  const deleteMaterial = (id) => {
    if (!window.confirm("この材料を削除しますか？")) return;
    setMaterials((prev) => prev.filter((x) => x.id !== id));
    if (editingMaterialId === id) clearMaterialForm();
  };

  const exportInvoiceCsv = () => {
    const target = invoiceViewMode === "month" ? selectedMonth : selectedYear;
    const header = [
      "集計区分",
      "対象期間",
      "現場名",
      "担当者",
      "制作者",
      "作業時間",
      "作業件数",
      "材料枚数",
      "材料件数",
      "作業請求",
      "材料請求",
      "請求金額",
    ];

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

    const csv = [header, ...rows]
      .map((row) => row.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");

    downloadTextFile(`請求集計_${target}.csv`, `\uFEFF${csv}`, "text/csv;charset=utf-8");
  };

  const printA3 = () => {
    window.print();
  };

  return (
    <div style={styles.app}>
      <style>{globalCss
/* ===== スマホ横はみ出し完全対策 ===== */
.phone,
.card,
.listCard,
.formGrid,
.twoGrid,
.logRow {
  max-width: 100% !important;
  min-width: 0 !important;
  overflow-x: hidden !important;
}

.card,
.listCard {
  padding-left: 12px !important;
  padding-right: 12px !important;
}

.formGrid {
  grid-template-columns: 58px minmax(0, 1fr) !important;
  gap: 10px 8px !important;
}

.formGrid > input,
.formGrid > select,
.formGrid > div,
.twoGrid input,
.twoGrid select {
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
}

input,
select {
  box-sizing: border-box !important;
  max-width: 100% !important;
}

input[type="date"] {
  font-size: 15px !important;
  padding-left: 10px !important;
  padding-right: 6px !important;
  text-align: center !important;
}

.twoGrid {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
  gap: 10px 8px !important;
}

@media (max-width: 430px) {
  .phone {
    padding-left: 10px !important;
    padding-right: 10px !important;
  }

  .formGrid {
    grid-template-columns: 54px minmax(0, 1fr) !important;
  }

  label {
    font-size: 14px !important;
  }

  input,
  select {
    height: 42px !important;
    font-size: 15px !important;
    border-radius: 14px !important;
    padding-left: 10px !important;
    padding-right: 8px !important;
  }
}}</style>

      <div style={styles.page} className="page-tight-mobile">
        <div style={styles.topNav} className="top-nav">
          <button
            style={{
              ...styles.navButton,
              opacity: screen === "site" ? 0.35 : 1,
              cursor: screen === "site" ? "default" : "pointer",
            }}
            onClick={goPrev}
            disabled={screen === "site"}
          >
            ←
          </button>

          <button
            style={{
              ...styles.navButton,
              opacity: screen === "invoice" ? 0.35 : 1,
              cursor: screen === "invoice" ? "default" : "pointer",
            }}
            onClick={goNext}
            disabled={screen === "invoice"}
          >
            →
          </button>
        </div>

        {screen === "site" && (
          <>
            <div style={styles.screenLabel}></div>
            <h1 style={styles.title}>現場登録</h1>

            <div style={styles.card}>
              <div style={styles.fieldGrid} className="field-grid">
                <div>
                  <div style={styles.label}>現場名</div>
                  <input
                    style={styles.input}
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    placeholder="現場名を入力"
                  />
                </div>

                <div>
                  <div style={styles.label}>担当者</div>
                  <select
                    style={styles.input}
                    value={sitePerson}
                    onChange={(e) => setSitePerson(e.target.value)}
                  >
                    {managers.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={styles.buttonRow} className="button-row">
                <button style={styles.primaryButton} onClick={saveSite}>
                  {editingSiteId ? "現場を更新" : "現場を登録"}
                </button>
                {editingSiteId && (
                  <button style={styles.ghostButton} onClick={resetSiteForm}>
                    キャンセル
                  </button>
                )}
              </div>
            </div>

            <div style={styles.card}>
              <div style={styles.sectionTitle}>登録済み現場</div>
              <div style={styles.listStack}>
                {siteSummaries.length === 0 && <div style={styles.empty}>まだ現場がありません</div>}
                {siteSummaries.map((site) => (
                  <div key={site.id} style={styles.siteItem} className="site-item">
                    <div style={styles.siteItemMain}>
                      <div style={styles.siteNameCompact}>
                        {site.name}　/　{site.person}　/　作業{site.workCount}件　/　材料{site.materialCount}件　/　作成月
                        {site.latestMonth === "-" ? "-" : toMonthLabel(site.latestMonth)}
                      </div>
                    </div>

                    <div style={styles.buttonRowInline} className="button-row">
                      <button style={styles.ghostButtonSmall} onClick={() => editSite(site)}>
                        編集
                      </button>
                      <button style={styles.primaryButtonSmall} onClick={() => openSite(site)}>
                        開く
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {screen === "creator" && (
          <>
            <div style={styles.screenLabel}></div>
            <h1 style={styles.title}>制作者選択</h1>

            <div style={styles.card}>
              <div style={styles.siteName}>{selectedSite?.name || "現場未選択"}</div>
              <div style={styles.siteMeta}>担当者：{selectedSite?.person || "-"}</div>
            </div>

            <div style={styles.card}>
              <div style={styles.label}>新規制作者登録</div>
              <div style={styles.fieldGrid} className="field-grid">
                <select
                  style={styles.input}
                  value={newCreatorName}
                  onChange={(e) => setNewCreatorName(e.target.value)}
                >
                  {workers.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>

                <button style={styles.primaryButton} onClick={addCreator}>
                  制作者を登録
                </button>
              </div>

              <div style={{ ...styles.label, marginTop: 18 }}>制作者を選ぶ</div>

              <div style={styles.creatorGrid} className="creator-grid">
                {creatorCards.length === 0 && <div style={styles.empty}>まだ制作者がいません</div>}
                {creatorCards.map((x) => {
                  const active = selectedCreator === x.creator;
                  return (
                    <button
                      key={x.creator}
                      className="creator-card-fix"
                      onClick={() => selectCreatorCard(x.creator)}
                      style={{
                        ...styles.creatorCard,
                        background: active ? "#08133e" : "#ffffff",
                        color: active ? "#ffffff" : "#08133e",
                        border: active ? "1px solid #08133e" : "1px solid #dce2ef",
                      }}
                    >
                      <div style={styles.creatorName}>{x.creator}</div>
                      <div style={styles.creatorMeta}>作業{x.workCount}件 / {formatNumber(x.workHoursTotal)}時間</div>
                      <div style={styles.creatorMeta}>材料{x.materialCount}件 / {formatNumber(x.materialQtyTotal)}枚</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {screen === "work" && (
          <>
            <div style={styles.screenLabel}></div>
            <h1 style={styles.title}>現場別作業登録</h1>

            <div style={styles.card}>
              <div style={styles.infoTop} className="field-grid">
                <div>
                  <div style={styles.siteName}>{selectedSite?.name || "-"}</div>
                  <div style={styles.siteMeta}>担当者：{selectedSite?.person || "-"}</div>
                  <div style={styles.pill}>制作者：{selectedCreator || "-"}</div>
                </div>
                <div>
                  <div style={styles.label}>対象月</div>
                  <input
                    style={styles.input}
                    type="month"
                    value={targetMonth}
                    onChange={(e) => setTargetMonth(e.target.value)}
                  />
                </div>
              </div>

              <div style={styles.kpiWrapCompact}>
                <div style={styles.kpiChip}>作業{selectedMonthWorkLogs.length}件 / {formatNumber(monthWorkHoursTotal)}時間</div>
                <div style={styles.kpiChip}>材料{selectedMonthMaterials.length}件 / {formatNumber(monthMaterialQtyTotal)}枚</div>
              </div>
            </div>

            <div style={styles.twoColumn} className="two-column">
              <div
                className="work-panel-tight"
                style={{
                  ...styles.formPanel,
                  ...styles.workPanel,
                  boxShadow: editingWorkId ? "0 0 0 2px #8bc2ff inset" : styles.formPanel.boxShadow,
                }}
              >
                <div style={styles.panelTitle}>作業追加</div>

                <div className="inline-field-row" style={styles.inlineFieldRow}>
                  <div className="inline-field-label" style={styles.inlineLabel}>日付</div>
                  <input
                    style={styles.compactInput}
                    type="date"
                    value={workDate}
                    onChange={(e) => setWorkDate(e.target.value)}
                  />
                </div>

                <div className="inline-field-row" style={styles.inlineFieldRow}>
                  <div className="inline-field-label" style={styles.inlineLabel}>作業時間</div>
                  <input
                    style={styles.compactInput}
                    type="number"
                    step="0.5"
                    value={workHours}
                    onChange={(e) => setWorkHours(e.target.value)}
                    placeholder="例：4"
                  />
                </div>

                <div className="inline-field-row" style={styles.inlineFieldRow}>
                  <div className="inline-field-label" style={styles.inlineLabel}>制作者</div>
                  <input style={styles.compactInput} value={selectedCreator || ""} readOnly />
                </div>

                <div style={styles.buttonRowCompact} className="button-row">
                  <button style={styles.primaryButtonCompact} onClick={saveWork}>
                    {editingWorkId ? "作業を更新" : "作業を追加"}
                  </button>
                </div>
              </div>

              <div
                className="material-panel-tight"
                style={{
                  ...styles.formPanel,
                  ...styles.materialPanel,
                  boxShadow: editingMaterialId ? "0 0 0 2px #96dfad inset" : styles.formPanel.boxShadow,
                }}
              >
                <div style={styles.panelTitle}>材料追加</div>

                <div className="inline-field-row" style={styles.inlineFieldRow}>
                  <div className="inline-field-label" style={styles.inlineLabel}>日付</div>
                  <input
                    style={styles.compactInput}
                    type="date"
                    value={materialDate}
                    onChange={(e) => setMaterialDate(e.target.value)}
                  />
                </div>

                <div className="inline-field-row" style={styles.inlineFieldRow}>
                  <div className="inline-field-label" style={styles.inlineLabel}>材質</div>
                  <select
                    style={styles.compactInput}
                    value={materialName}
                    onChange={(e) => setMaterialName(e.target.value)}
                  >
                    {materialOptions.map((m) => (
                      <option key={m.name} value={m.name}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={styles.materialGrid2} className="material-grid-2">
                  <div>
                    <div style={styles.inlineLabelGrid}>厚み</div>
                    <select
                      style={styles.compactInput}
                      value={materialThickness}
                      onChange={(e) => setMaterialThickness(e.target.value)}
                    >
                      {thicknessOptions.map((t) => (
                        <option key={t.thickness} value={t.thickness}>
                          {t.thickness}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div style={styles.inlineLabelGrid}>サイズ</div>
                    <select
                      style={styles.compactInput}
                      value={materialSize}
                      onChange={(e) => setMaterialSize(e.target.value)}
                    >
                      {sizeOptions.map((s) => (
                        <option key={s.size} value={s.size}>
                          {s.size}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div style={styles.inlineLabelGrid}>枚数</div>
                    <input
                      style={styles.compactInput}
                      type="number"
                      step="0.1"
                      value={materialQty}
                      onChange={(e) => setMaterialQty(e.target.value)}
                      placeholder="例：2.0"
                    />
                  </div>

                  <div>
                    <div style={styles.inlineLabelGrid}>単価</div>
                    <input style={styles.compactInput} value={formatNumber(getUnitPrice())} readOnly />
                  </div>
                </div>

                <div style={styles.buttonRowCompact} className="button-row">
                  <button style={styles.primaryButtonCompact} onClick={saveMaterial}>
                    {editingMaterialId ? "材料を更新" : "材料を追加"}
                  </button>
                </div>
              </div>
            </div>

            <div style={styles.twoColumn} className="two-column">
              <div style={styles.card}>
                <div style={styles.sectionTitle}>追加済み作業</div>
                <div style={styles.listStack}>
                  {selectedMonthWorkLogs.length === 0 && <div style={styles.empty}>データなし</div>}
                  {selectedMonthWorkLogs.map((x) => (
                    <div key={x.id} style={styles.recordItem} className="record-item">
                      <div style={styles.recordMain}>
                        <div style={styles.recordHeadline}>{x.date}</div>
                        <div style={styles.recordSub}>{x.creator}</div>
                        <div style={styles.recordSub}>{x.hours}時間</div>
                      </div>
                      <div style={styles.buttonRowInline} className="button-row">
                        <button style={styles.ghostButtonSmall} onClick={() => editWork(x)}>
                          編集
                        </button>
                        <button style={styles.dangerButtonSmall} onClick={() => deleteWork(x.id)}>
                          削除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={styles.card}>
                <div style={styles.sectionTitle}>追加済み材料</div>
                <div style={styles.listStack}>
                  {selectedMonthMaterials.length === 0 && <div style={styles.empty}>データなし</div>}
                  {selectedMonthMaterials.map((x) => (
                    <div key={x.id} style={styles.recordItem} className="record-item">
                      <div style={styles.recordMain}>
                        <div style={styles.recordHeadline}>{x.date}</div>
                        <div style={styles.recordSub}>{x.name}</div>
                        <div style={styles.recordSub}>{x.thickness} / {x.size}</div>
                        <div style={styles.recordSub}>{x.qty}枚</div>
                      </div>
                      <div style={styles.buttonRowInline} className="button-row">
                        <button style={styles.ghostButtonSmall} onClick={() => editMaterial(x)}>
                          編集
                        </button>
                        <button style={styles.dangerButtonSmall} onClick={() => deleteMaterial(x.id)}>
                          削除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <button style={styles.primaryWideButton} onClick={() => setScreen("creator")}>
                完了して戻る
              </button>
            </div>
          </>
        )}

        {screen === "invoice" && (
          <>
            <div style={styles.screenLabel}></div>
            <h1 style={styles.title}>請求書・集計</h1>

            <div style={styles.card}>
              <div style={styles.label}>集計区分</div>
              <div style={styles.segmentRow} className="button-row">
                <button
                  style={{
                    ...styles.segmentButton,
                    ...(invoiceViewMode === "month" ? styles.segmentActive : {}),
                  }}
                  onClick={() => setInvoiceViewMode("month")}
                >
                  月次
                </button>
                <button
                  style={{
                    ...styles.segmentButton,
                    ...(invoiceViewMode === "year" ? styles.segmentActive : {}),
                  }}
                  onClick={() => setInvoiceViewMode("year")}
                >
                  年次
                </button>
              </div>

              <div style={{ height: 12 }} />

              <div style={styles.label}>{invoiceViewMode === "month" ? "月選択" : "年選択"}</div>
              <div style={styles.actionRow} className="action-row">
                {invoiceViewMode === "month" ? (
                  <input
                    style={{ ...styles.input, minWidth: 180 }}
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                  />
                ) : (
                  <input
                    style={{ ...styles.input, minWidth: 180 }}
                    type="number"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                  />
                )}

                <button style={styles.ghostButton} onClick={exportInvoiceCsv}>
                  CSV出力
                </button>
                <button style={styles.primaryDarkButton} onClick={printA3}>
                  A3印刷
                </button>
                <button style={styles.ghostButton} onClick={() => setScreen("work")}>
                  作業画面へ
                </button>
              </div>
            </div>

            <div style={styles.summaryGrid} className="summary-grid">
              <div style={styles.summaryCard}>
                <div style={styles.kpiLabel}>作業請求額</div>
                <div style={styles.summaryAmount}>{formatMoney(invoiceTotalWork)}</div>
              </div>
              <div style={styles.summaryCard}>
                <div style={styles.kpiLabel}>材料請求額</div>
                <div style={styles.summaryAmount}>{formatMoney(invoiceTotalMaterial)}</div>
              </div>
              <div style={styles.summaryCard}>
                <div style={styles.kpiLabel}>請求合計</div>
                <div style={styles.summaryAmount}>{formatMoney(invoiceTotal)}</div>
              </div>
            </div>

            <div style={styles.card}>
              <div style={styles.sectionTitle}>請求一覧</div>
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>現場名</th>
                      <th style={styles.th}>担当者</th>
                      <th style={styles.th}>制作者</th>
                      <th style={styles.thRight}>作業時間</th>
                      <th style={styles.thRight}>材料枚数</th>
                      <th style={styles.thRight}>作業請求</th>
                      <th style={styles.thRight}>材料請求</th>
                      <th style={styles.thRight}>請求額</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceRows.length === 0 && (
                      <tr>
                        <td style={styles.tdEmpty} colSpan={8}>
                          データがありません
                        </td>
                      </tr>
                    )}
                    {invoiceRows.map((row) => (
                      <tr key={`${row.siteId}_${row.creator}`}>
                        <td style={styles.td}>{row.siteName}</td>
                        <td style={styles.td}>{row.manager}</td>
                        <td style={styles.td}>{row.creator}</td>
                        <td style={styles.tdRight}>{formatNumber(row.workHoursTotal)}</td>
                        <td style={styles.tdRight}>{formatNumber(row.materialQtyTotal)}</td>
                        <td style={styles.tdRight}>{formatMoney(row.workAmount)}</td>
                        <td style={styles.tdRight}>{formatMoney(row.materialAmount)}</td>
                        <td style={{ ...styles.tdRight, fontWeight: 800 }}>{formatMoney(row.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const globalCss = `
  * {
    box-sizing: border-box;
  }

  html, body, #root {
    margin: 0;
    padding: 0;
    min-height: 100%;
    font-family: "Hiragino Sans", "Yu Gothic", "Meiryo", sans-serif;
    background: #f5f7fb;
    color: #0a1333;
    overflow-x: hidden;
  }

  body {
    overflow-x: hidden;
  }

  button, input, select {
    font: inherit;
  }

  input[type="date"],
  input[type="month"] {
    width: 100% !important;
    min-width: 0 !important;
  }

  @media (max-width: 768px) {
    .page-tight-mobile {
      padding-left: 4px !important;
      padding-right: 4px !important;
    }

    .work-panel-tight,
    .material-panel-tight {
      padding: 12px !important;
    }

    .field-grid {
      grid-template-columns: 1fr !important;
      gap: 10px !important;
    }

    .two-column {
      grid-template-columns: 1fr !important;
      gap: 14px !important;
    }

    .creator-grid {
      grid-template-columns: 1fr !important;
      gap: 10px !important;
    }

    .summary-grid {
      grid-template-columns: 1fr !important;
      gap: 12px !important;
    }

    .action-row {
      flex-direction: column !important;
      align-items: stretch !important;
      gap: 10px !important;
    }

    .button-row {
      flex-wrap: wrap !important;
      gap: 8px !important;
    }

    .site-item,
    .record-item {
      flex-direction: column !important;
      align-items: stretch !important;
    }

    .top-nav {
      display: flex !important;
      flex-direction: row !important;
      justify-content: space-between !important;
      align-items: center !important;
      gap: 12px !important;
      padding: 10px !important;
    }

    .top-nav button {
      width: 38px !important;
      height: 38px !important;
      min-width: 38px !important;
      max-width: 38px !important;
      flex: 0 0 38px !important;
      font-size: 15px !important;
      border-radius: 12px !important;
      padding: 0 !important;
    }

    h1 {
      font-size: 24px !important;
      line-height: 1.22 !important;
      margin: 0 !important;
      word-break: keep-all;
    }

    input,
    select {
      height: 42px !important;
      font-size: 13px !important;
      padding: 0 12px !important;
      border-radius: 14px !important;
      width: 100% !important;
      max-width: 100% !important;
      min-width: 0 !important;
    }

    input[type="date"],
    input[type="month"] {
      font-size: 12px !important;
      letter-spacing: -0.01em !important;
      padding-right: 8px !important;
    }

    button {
      font-size: 13px !important;
      border-radius: 14px !important;
    }

    .inline-field-row {
      display: grid !important;
      grid-template-columns: 60px minmax(0, 1fr) !important;
      gap: 6px !important;
      align-items: center !important;
      margin-bottom: 8px !important;
    }

    .inline-field-label {
      font-size: 12px !important;
      white-space: nowrap !important;
      min-width: 0 !important;
    }

    .material-grid-2 {
      grid-template-columns: 1fr 1fr !important;
      gap: 8px !important;
      margin-top: 6px !important;
    }

    .site-item {
      padding: 10px !important;
      gap: 8px !important;
    }

    .site-item > div:first-child {
      min-width: 0 !important;
      overflow: hidden !important;
    }

    .creator-card-fix {
      min-width: 0 !important;
      width: 100% !important;
    }

    table {
      min-width: 720px !important;
    }
  }

  @media print {
    body {
      background: white !important;
    }

    button {
      display: none !important;
    }

    input, select {
      border: none !important;
      background: white !important;
      padding: 0 !important;
      height: auto !important;
    }
  }
`;

const styles = {
  app: {
    minHeight: "100vh",
    background: "#f5f7fb",
    padding: "18px 12px 56px",
  },
  page: {
    width: "100%",
    maxWidth: 980,
    margin: "0 auto",
    background: "#eef2f7",
    border: "1px solid #e2e8f1",
    borderRadius: 16,
    padding: 6,
    overflowX: "hidden",
  },
  topNav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    background: "#fff",
    borderRadius: 22,
    padding: 12,
    boxShadow: "0 8px 24px rgba(17, 24, 39, 0.06)",
    marginBottom: 18,
  },
  navButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    border: "none",
    background: "#08133e",
    color: "#fff",
    fontSize: 15,
    fontWeight: 800,
    padding: 0,
    flex: "0 0 38px",
  },
  screenLabel: {
    color: "#8b95a9",
    fontSize: 13,
    marginBottom: 6,
  },
  title: {
    margin: 0,
    fontSize: "clamp(18px, 4.8vw, 34px)",
    lineHeight: 1.2,
    letterSpacing: "0.01em",
    color: "#08133e",
    marginBottom: 10,
  },
  card: {
    background: "#fff",
    borderRadius: 22,
    padding: 14,
    marginBottom: 14,
    boxShadow: "0 8px 20px rgba(17, 24, 39, 0.05)",
    border: "1px solid #e4e8f2",
  },
  fieldGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: 700,
    color: "#7d879e",
    marginBottom: 8,
  },
  input: {
    width: "100%",
    height: 54,
    borderRadius: 18,
    border: "1px solid #d7deea",
    background: "#fff",
    padding: "0 16px",
    fontSize: 16,
    color: "#0a1333",
    outline: "none",
    minWidth: 0,
  },
  compactInput: {
    width: "100%",
    height: 42,
    borderRadius: 14,
    border: "1px solid #cfd8e7",
    background: "#fff",
    padding: "0 12px",
    fontSize: 13,
    color: "#0a1333",
    outline: "none",
    minWidth: 0,
  },
  buttonRow: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    marginTop: 14,
  },
  buttonRowInline: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    marginTop: 0,
  },
  buttonRowCompact: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    marginTop: 12,
  },
  primaryButton: {
    height: 44,
    border: "none",
    borderRadius: 14,
    padding: "0 18px",
    background: "#3e66e5",
    color: "#fff",
    fontSize: 14,
    fontWeight: 800,
    cursor: "pointer",
  },
  primaryButtonCompact: {
    height: 40,
    border: "none",
    borderRadius: 14,
    padding: "0 18px",
    background: "#3e66e5",
    color: "#fff",
    fontSize: 13,
    fontWeight: 800,
    cursor: "pointer",
  },
  primaryWideButton: {
    width: "100%",
    maxWidth: 360,
    height: 48,
    border: "none",
    borderRadius: 16,
    padding: "0 24px",
    background: "#3e66e5",
    color: "#fff",
    fontSize: 15,
    fontWeight: 800,
    cursor: "pointer",
    display: "block",
    margin: "0 auto",
  },
  primaryButtonSmall: {
    height: 38,
    border: "none",
    borderRadius: 12,
    padding: "0 14px",
    background: "#08133e",
    color: "#fff",
    fontSize: 13,
    fontWeight: 800,
    cursor: "pointer",
  },
  primaryDarkButton: {
    height: 44,
    border: "none",
    borderRadius: 14,
    padding: "0 18px",
    background: "#08133e",
    color: "#fff",
    fontSize: 14,
    fontWeight: 800,
    cursor: "pointer",
  },
  ghostButton: {
    height: 44,
    borderRadius: 14,
    padding: "0 18px",
    border: "1px solid #d7deea",
    background: "#fff",
    color: "#0a1333",
    fontSize: 14,
    fontWeight: 800,
    cursor: "pointer",
  },
  ghostButtonSmall: {
    height: 38,
    borderRadius: 12,
    padding: "0 14px",
    border: "1px solid #d7deea",
    background: "#fff",
    color: "#0a1333",
    fontSize: 13,
    fontWeight: 800,
    cursor: "pointer",
  },
  dangerButtonSmall: {
    height: 38,
    borderRadius: 12,
    padding: "0 14px",
    border: "none",
    background: "#ef5350",
    color: "#fff",
    fontSize: 13,
    fontWeight: 800,
    cursor: "pointer",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 800,
    color: "#08133e",
    marginBottom: 12,
  },
  listStack: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  empty: {
    color: "#8d97ad",
    padding: "8px 0",
    fontSize: 13,
  },
  siteNameCompact: {
    fontSize: 12.5,
    fontWeight: 700,
    color: "#08133e",
    lineHeight: 1.35,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  siteItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    border: "1px solid #e0e6f0",
    borderRadius: 16,
    padding: 10,
    background: "#fff",
  },
  siteItemMain: {
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
  },
  siteName: {
    fontSize: "clamp(20px, 4.4vw, 30px)",
    fontWeight: 900,
    color: "#08133e",
    lineHeight: 1.15,
  },
  siteMeta: {
    marginTop: 6,
    fontSize: 15,
    color: "#7a859d",
  },
  creatorGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
    gap: 12,
    marginTop: 10,
  },
  creatorCard: {
    minHeight: 88,
    borderRadius: 18,
    padding: 12,
    textAlign: "left",
    cursor: "pointer",
    boxShadow: "0 6px 16px rgba(17,24,39,0.05)",
  },
  creatorName: {
    fontSize: 15,
    fontWeight: 800,
    marginBottom: 6,
    lineHeight: 1.2,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  creatorMeta: {
    fontSize: 12,
    lineHeight: 1.35,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  infoTop: {
    alignItems: "end",
  },
  pill: {
    display: "inline-flex",
    alignItems: "center",
    marginTop: 10,
    padding: "8px 14px",
    borderRadius: 999,
    background: "#edf1f7",
    color: "#5d6881",
    fontWeight: 700,
    fontSize: 13,
  },
  kpiWrapCompact: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 12,
  },
  kpiChip: {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 14px",
    borderRadius: 999,
    background: "#eef2f8",
    color: "#4f5b75",
    fontWeight: 800,
    fontSize: 13,
  },
  twoColumn: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
    marginBottom: 14,
  },
  formPanel: {
    borderRadius: 22,
    padding: 14,
    border: "1px solid #e2e8f2",
    boxShadow: "0 8px 20px rgba(17, 24, 39, 0.05)",
  },
  workPanel: {
    background: "#eef6ff",
    borderColor: "#cfe4ff",
  },
  materialPanel: {
    background: "#eefaf0",
    borderColor: "#cfeecf",
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: 900,
    color: "#08133e",
    marginBottom: 12,
  },
  inlineFieldRow: {
    display: "grid",
    gridTemplateColumns: "64px minmax(0, 1fr)",
    gap: 8,
    alignItems: "center",
    marginBottom: 8,
  },
  inlineLabel: {
    fontSize: 13,
    fontWeight: 700,
    color: "#6b7690",
    whiteSpace: "nowrap",
  },
  inlineLabelGrid: {
    fontSize: 13,
    fontWeight: 700,
    color: "#6b7690",
    whiteSpace: "nowrap",
    marginBottom: 6,
  },
  materialGrid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    marginTop: 8,
  },
  recordItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    border: "1px solid #dce3ef",
    borderRadius: 18,
    padding: 12,
    background: "#fff",
  },
  recordMain: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },
  recordHeadline: {
    fontSize: 16,
    color: "#08133e",
    lineHeight: 1.35,
    fontWeight: 900,
  },
  recordSub: {
    fontSize: 14,
    color: "#5f6b85",
    lineHeight: 1.35,
  },
  segmentRow: {
    display: "flex",
    gap: 10,
    alignItems: "center",
  },
  segmentButton: {
    height: 40,
    borderRadius: 14,
    padding: "0 18px",
    border: "1px solid #d7deea",
    background: "#fff",
    color: "#08133e",
    fontSize: 14,
    fontWeight: 800,
    cursor: "pointer",
  },
  segmentActive: {
    background: "#08133e",
    color: "#fff",
    border: "1px solid #08133e",
  },
  actionRow: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 14,
    marginBottom: 14,
  },
  summaryCard: {
    background: "#fff",
    borderRadius: 20,
    padding: 16,
    border: "1px solid #e4e8f2",
    boxShadow: "0 10px 24px rgba(17, 24, 39, 0.05)",
  },
  kpiLabel: {
    fontSize: 13,
    color: "#7f8aa2",
    fontWeight: 700,
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: "clamp(22px, 4vw, 38px)",
    lineHeight: 1.2,
    fontWeight: 900,
    color: "#08133e",
    marginTop: 8,
    wordBreak: "break-word",
  },
  tableWrap: {
    width: "100%",
    overflowX: "auto",
    borderRadius: 18,
    border: "1px solid #e5e9f2",
  },
  table: {
    width: "100%",
    minWidth: 860,
    borderCollapse: "collapse",
    background: "#fff",
  },
  th: {
    background: "#f0f3f8",
    color: "#7a849b",
    textAlign: "left",
    padding: "14px 12px",
    fontSize: 13,
    fontWeight: 800,
    borderBottom: "1px solid #dee4ef",
    whiteSpace: "nowrap",
  },
  thRight: {
    background: "#f0f3f8",
    color: "#7a849b",
    textAlign: "right",
    padding: "14px 12px",
    fontSize: 13,
    fontWeight: 800,
    borderBottom: "1px solid #dee4ef",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "14px 12px",
    fontSize: 14,
    color: "#08133e",
    borderBottom: "1px solid #edf1f6",
    whiteSpace: "nowrap",
  },
  tdRight: {
    padding: "14px 12px",
    fontSize: 14,
    color: "#08133e",
    borderBottom: "1px solid #edf1f6",
    whiteSpace: "nowrap",
    textAlign: "right",
  },
  tdEmpty: {
    padding: 20,
    fontSize: 14,
    color: "#8c96ad",
    textAlign: "center",
  },
};
