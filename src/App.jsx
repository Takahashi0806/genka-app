import React, { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "genka-app-4screen-mobile-ideal-v1";
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
  return `${Math.round(Number(value || 0)).toLocaleString("ja-JP")}円`;
}

function formatDateLabel(value) {
  if (!value) return "";
  const [y, m, d] = value.split("-");
  if (!y || !m || !d) return value;
  return `${Number(y)}年${Number(m)}月${Number(d)}日`;
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
      setSelectedSiteId(data.selectedSiteId || null);
      setSelectedCreator(data.selectedCreator || "");
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    const data = { sites, siteCreatorsMap, workLogs, materials, selectedSiteId, selectedCreator };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [sites, siteCreatorsMap, workLogs, materials, selectedSiteId, selectedCreator]);

  const selectedSite = useMemo(() => sites.find((s) => s.id === selectedSiteId) || null, [sites, selectedSiteId]);

  const thicknessOptions = useMemo(() => {
    const found = materialOptions.find((m) => m.name === materialName);
    return found ? found.thicknesses : [];
  }, [materialName]);

  const sizeOptions = useMemo(() => {
    const found = thicknessOptions.find((t) => t.thickness === materialThickness);
    return found ? found.sizes : [];
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
    if (!found.sizes.some((s) => s.size === materialSize)) setMaterialSize(found.sizes[0]?.size || "");
  }, [thicknessOptions, materialThickness, materialSize]);

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
    return sites.map((site) => ({
      ...site,
      workCount: workLogs.filter((x) => x.siteId === site.id).length,
      materialCount: materials.filter((x) => x.siteId === site.id).length,
    }));
  }, [sites, workLogs, materials]);

  const creatorCards = useMemo(() => {
    if (!selectedSite) return [];
    return (siteCreatorsMap[selectedSite.id] || []).map((creator) => {
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
    const map = {};
    const ensureRow = (siteId, creator) => {
      const site = sites.find((s) => s.id === siteId);
      const key = `${siteId}_${creator}`;
      if (!map[key]) {
        map[key] = {
          siteId,
          siteName: site?.name || "",
          manager: site?.person || "",
          creator,
          workHoursTotal: 0,
          workCount: 0,
          materialQtyTotal: 0,
          materialCount: 0,
          workAmount: 0,
          materialAmount: 0,
          total: 0,
        };
      }
      return map[key];
    };

    workLogs.forEach((x) => {
      const hit = invoiceViewMode === "month" ? (x.date || "").slice(0, 7) === selectedMonth : (x.date || "").slice(0, 4) === selectedYear;
      if (!hit) return;
      const row = ensureRow(x.siteId, x.creator);
      row.workHoursTotal += Number(x.hours || 0);
      row.workCount += 1;
      row.workAmount += Number(x.hours || 0) * getHourlyRate(x.creator) * OVERHEAD;
    });

    materials.forEach((x) => {
      const hit = invoiceViewMode === "month" ? (x.date || "").slice(0, 7) === selectedMonth : (x.date || "").slice(0, 4) === selectedYear;
      if (!hit) return;
      const row = ensureRow(x.siteId, x.creator);
      row.materialQtyTotal += Number(x.qty || 0);
      row.materialCount += 1;
      row.materialAmount += Number(x.qty || 0) * Number(x.unitPrice || 0) * OVERHEAD;
    });

    return Object.values(map)
      .map((row) => ({ ...row, total: row.workAmount + row.materialAmount }))
      .sort((a, b) => (a.siteName !== b.siteName ? a.siteName.localeCompare(b.siteName, "ja") : a.creator.localeCompare(b.creator, "ja")));
  }, [sites, workLogs, materials, invoiceViewMode, selectedMonth, selectedYear]);

  const getUnitPrice = () => Number(sizeOptions.find((x) => x.size === materialSize)?.unitPrice || 0);

  const notify = (message) => window.alert(message);

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

  const saveSite = () => {
    if (!siteName.trim()) return notify("現場名を入力してください");
    if (editingSiteId) {
      setSites((prev) => prev.map((s) => (s.id === editingSiteId ? { ...s, name: siteName.trim(), person: sitePerson } : s)));
      resetSiteForm();
      notify("現場を更新しました");
      return;
    }
    const newSite = { id: makeId("site"), name: siteName.trim(), person: sitePerson, isActive: true, createdAt: today() };
    setSites((prev) => [newSite, ...prev]);
    setSiteCreatorsMap((prev) => ({ ...prev, [newSite.id]: [] }));
    setSelectedSiteId(newSite.id);
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
    setSiteCreatorsMap((prev) => ({ ...prev, [selectedSite.id]: [...current, newCreatorName] }));
    setSelectedCreator(newCreatorName);
    notify("制作者を登録しました");
  };

  const saveWork = () => {
    if (!selectedSite) return notify("先に現場を選んでください");
    if (!selectedCreator) return notify("先に制作者を選んでください");
    if (!workHours) return notify("作業時間を入力してください");
    const row = { id: editingWorkId || makeId("work"), siteId: selectedSite.id, date: workDate, creator: selectedCreator, hours: String(workHours) };
    if (editingWorkId) setWorkLogs((prev) => prev.map((x) => (x.id === editingWorkId ? row : x)));
    else setWorkLogs((prev) => [row, ...prev]);
    setWorkHours("");
    setWorkDate(today());
    setEditingWorkId(null);
    notify(editingWorkId ? "作業を更新しました" : "作業を追加しました");
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
    if (editingMaterialId) setMaterials((prev) => prev.map((x) => (x.id === editingMaterialId ? row : x)));
    else setMaterials((prev) => [row, ...prev]);
    setMaterialQty("");
    setMaterialDate(today());
    setEditingMaterialId(null);
    notify(editingMaterialId ? "材料を更新しました" : "材料を追加しました");
  };

  const editWork = (row) => {
    setEditingWorkId(row.id);
    setWorkDate(row.date);
    setWorkHours(row.hours);
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  const deleteWork = (id) => {
    if (!window.confirm("この作業を削除しますか？")) return;
    setWorkLogs((prev) => prev.filter((x) => x.id !== id));
  };

  const deleteMaterial = (id) => {
    if (!window.confirm("この材料を削除しますか？")) return;
    setMaterials((prev) => prev.filter((x) => x.id !== id));
  };

  const exportInvoiceCsv = () => {
    const target = invoiceViewMode === "month" ? selectedMonth : selectedYear;
    const header = ["集計区分", "対象期間", "現場名", "担当者", "制作者", "作業時間", "材料枚数", "作業請求", "材料請求", "請求金額"];
    const rows = invoiceRows.map((r) => [
      invoiceViewMode === "month" ? "月次" : "年次",
      target,
      r.siteName,
      r.manager,
      r.creator,
      r.workHoursTotal,
      r.materialQtyTotal,
      Math.round(r.workAmount),
      Math.round(r.materialAmount),
      Math.round(r.total),
    ]);
    const csv = [header, ...rows].map((row) => row.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    downloadTextFile(`請求集計_${target}.csv`, `\uFEFF${csv}`, "text/csv;charset=utf-8");
  };

  const invoiceTotalWork = invoiceRows.reduce((sum, x) => sum + x.workAmount, 0);
  const invoiceTotalMaterial = invoiceRows.reduce((sum, x) => sum + x.materialAmount, 0);
  const invoiceTotal = invoiceRows.reduce((sum, x) => sum + x.total, 0);

  return (
    <div className="app">
      <style>{css}</style>
      <main className="phone">
        <nav className="topNav">
          <button className="navButton" disabled={screen === "site"} onClick={goPrev}>←</button>
          <div className="navCenter">
            <span>{screen === "site" ? "画面1" : screen === "creator" ? "画面2" : screen === "work" ? "画面3" : "画面4"}</span>
          </div>
          <button className="navButton" disabled={screen === "invoice"} onClick={goNext}>→</button>
        </nav>

        {screen === "site" && (
          <>
            <section className="whiteCard">
              <h1>現場登録</h1>
              <div className="formGrid">
                <label>現場名</label>
                <input value={siteName} onChange={(e) => setSiteName(e.target.value)} placeholder="現場名を入力" />
                <label>担当者</label>
                <select value={sitePerson} onChange={(e) => setSitePerson(e.target.value)}>
                  {managers.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="buttonRow">
                <button className="primary" onClick={saveSite}>{editingSiteId ? "現場を更新" : "現場を登録"}</button>
                {editingSiteId && <button className="subButton" onClick={resetSiteForm}>キャンセル</button>}
              </div>
            </section>

            <section className="whiteCard">
              <h2>登録済み現場</h2>
              {siteSummaries.length === 0 && <p className="empty">まだ現場がありません</p>}
              {siteSummaries.map((site) => (
                <div className="siteRow" key={site.id}>
                  <div className="siteText">
                    <strong>{site.name}</strong>
                    <span>担当者：{site.person}　作業{site.workCount}件 / 材料{site.materialCount}件</span>
                  </div>
                  <button className="smallGhost" onClick={() => editSite(site)}>編集</button>
                  <button className="smallPrimary" onClick={() => openSite(site)}>開く</button>
                </div>
              ))}
            </section>
          </>
        )}

        {screen === "creator" && (
          <>
            <section className="whiteCard">
              <h1>制作者選択</h1>
              <div className="siteHeaderMini">
                <strong>{selectedSite?.name || "現場未選択"}</strong>
                <span>担当者：{selectedSite?.person || "-"}</span>
              </div>
              <div className="formGrid singleTop">
                <label>制作者</label>
                <select value={newCreatorName} onChange={(e) => setNewCreatorName(e.target.value)}>
                  {workers.map((w) => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
              <button className="primary" onClick={addCreator}>制作者を登録</button>
            </section>

            <section className="whiteCard">
              <h2>登録済み制作者</h2>
              <div className="workerGrid">
                {creatorCards.length === 0 && <p className="empty">まだ制作者がいません</p>}
                {creatorCards.map((x) => (
                  <button
                    key={x.creator}
                    className={selectedCreator === x.creator ? "workerCard active" : "workerCard"}
                    onClick={() => { setSelectedCreator(x.creator); setScreen("work"); }}
                  >
                    <strong>{x.creator}</strong>
                    <span>作業{x.workCount}件 / {formatNumber(x.workHoursTotal)}時間</span>
                    <span>材料{x.materialCount}件 / {formatNumber(x.materialQtyTotal)}枚</span>
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        {screen === "work" && (
          <>
            <section className="whiteCard summaryCard">
              <h1>{selectedSite?.name || "現場未選択"}</h1>
              <p className="managerLine">担当者：{selectedSite?.person || "-"}</p>
              <div className="creatorPill">制作者：{selectedCreator || "-"}</div>
              <label className="blockLabel">対象月</label>
              <input className="monthInput" type="month" value={targetMonth} onChange={(e) => setTargetMonth(e.target.value)} />
              <div className="chipRow">
                <div className="infoChip">作業{selectedMonthWorkLogs.length}件 / {formatNumber(monthWorkHoursTotal)}時間</div>
                <div className="infoChip">材料{selectedMonthMaterials.length}件 / {formatNumber(monthMaterialQtyTotal)}枚</div>
              </div>
            </section>

            <section className={editingWorkId ? "panel blue editing" : "panel blue"}>
              <h2>作業追加</h2>
              <div className="formGrid">
                <label>日付</label>
                <input type="date" value={workDate} onChange={(e) => setWorkDate(e.target.value)} />
                <label>作業時間</label>
                <div className="unitInput"><input type="number" step="0.5" value={workHours} onChange={(e) => setWorkHours(e.target.value)} placeholder="例：4" /><span>時間</span></div>
                <label>制作者</label>
                <input value={selectedCreator || ""} readOnly />
              </div>
              <button className="primary" onClick={saveWork}>{editingWorkId ? "作業を更新" : "作業を追加"}</button>
            </section>

            <section className={editingMaterialId ? "panel green editingGreen" : "panel green"}>
              <h2>材料追加</h2>
              <div className="formGrid">
                <label>日付</label>
                <input type="date" value={materialDate} onChange={(e) => setMaterialDate(e.target.value)} />
                <label>材質</label>
                <select value={materialName} onChange={(e) => setMaterialName(e.target.value)}>
                  {materialOptions.map((m) => <option key={m.name} value={m.name}>{m.name}</option>)}
                </select>
              </div>
              <div className="twoGrid">
                <div>
                  <label>厚み</label>
                  <select value={materialThickness} onChange={(e) => setMaterialThickness(e.target.value)}>
                    {thicknessOptions.map((t) => <option key={t.thickness} value={t.thickness}>{t.thickness}</option>)}
                  </select>
                </div>
                <div>
                  <label>サイズ</label>
                  <select value={materialSize} onChange={(e) => setMaterialSize(e.target.value)}>
                    {sizeOptions.map((s) => <option key={s.size} value={s.size}>{s.size}</option>)}
                  </select>
                </div>
                <div>
                  <label>枚数</label>
                  <div className="unitInput"><input type="number" step="0.1" value={materialQty} onChange={(e) => setMaterialQty(e.target.value)} placeholder="例：2.0" /><span>枚</span></div>
                </div>
                <div>
                  <label>単価</label>
                  <div className="unitInput"><input value={formatNumber(getUnitPrice())} readOnly /><span>円</span></div>
                </div>
              </div>
              <button className="greenButton" onClick={saveMaterial}>{editingMaterialId ? "材料を更新" : "材料を追加"}</button>
            </section>

            <section className="whiteCard">
              <h2>追加済み作業</h2>
              {selectedMonthWorkLogs.length === 0 && <p className="empty">データなし</p>}
              {selectedMonthWorkLogs.map((x) => (
                <div className="logRow" key={x.id}>
                  <strong>{formatDateLabel(x.date)}</strong>
                  <span>{x.creator}</span>
                  <span>{x.hours}時間</span>
                  <button className="smallGhost" onClick={() => editWork(x)}>編集</button>
                  <button className="smallDanger" onClick={() => deleteWork(x.id)}>削除</button>
                </div>
              ))}
            </section>

            <section className="whiteCard">
              <h2>追加済み材料</h2>
              {selectedMonthMaterials.length === 0 && <p className="empty">データなし</p>}
              {selectedMonthMaterials.map((x) => (
                <div className="logRow material" key={x.id}>
                  <strong>{formatDateLabel(x.date)}</strong>
                  <span>{x.name} {x.thickness} {x.size}</span>
                  <span>{x.qty}枚</span>
                  <button className="smallGhost" onClick={() => editMaterial(x)}>編集</button>
                  <button className="smallDanger" onClick={() => deleteMaterial(x.id)}>削除</button>
                </div>
              ))}
            </section>
          </>
        )}

        {screen === "invoice" && (
          <>
            <section className="whiteCard">
              <h1>請求書・集計</h1>
              <div className="segment">
                <button className={invoiceViewMode === "month" ? "active" : ""} onClick={() => setInvoiceViewMode("month")}>月次</button>
                <button className={invoiceViewMode === "year" ? "active" : ""} onClick={() => setInvoiceViewMode("year")}>年次</button>
              </div>
              <div className="formGrid singleTop">
                <label>{invoiceViewMode === "month" ? "月選択" : "年選択"}</label>
                {invoiceViewMode === "month" ? (
                  <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
                ) : (
                  <input type="number" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} />
                )}
              </div>
              <div className="buttonRow">
                <button className="subButton" onClick={exportInvoiceCsv}>CSV出力</button>
                <button className="primary" onClick={() => window.print()}>印刷</button>
              </div>
            </section>

            <section className="totalGrid">
              <div><span>作業請求</span><strong>{formatMoney(invoiceTotalWork)}</strong></div>
              <div><span>材料請求</span><strong>{formatMoney(invoiceTotalMaterial)}</strong></div>
              <div><span>請求合計</span><strong>{formatMoney(invoiceTotal)}</strong></div>
            </section>

            <section className="whiteCard">
              <h2>請求一覧</h2>
              {invoiceRows.length === 0 && <p className="empty">データがありません</p>}
              {invoiceRows.map((row) => (
                <div className="invoiceRow" key={`${row.siteId}_${row.creator}`}>
                  <strong>{row.siteName}</strong>
                  <span>{row.manager} / {row.creator}</span>
                  <span>作業 {formatNumber(row.workHoursTotal)}h　材料 {formatNumber(row.materialQtyTotal)}枚</span>
                  <b>{formatMoney(row.total)}</b>
                </div>
              ))}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

const css = `
* { box-sizing: border-box; }
html, body, #root { width: 100%; min-height: 100%; margin: 0; overflow-x: hidden; background: #f3f6fb; color: #07133b; font-family: -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Yu Gothic", "Meiryo", sans-serif; }
button, input, select { font: inherit; }
button { cursor: pointer; }
.app { width: 100%; min-height: 100vh; overflow-x: hidden; background: linear-gradient(180deg, #f8fbff 0%, #eef3f8 100%); }
.phone { width: 100%; max-width: 430px; margin: 0 auto; padding: 8px 14px 70px; overflow-x: hidden; }
.topNav { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 4px 0 8px; }
.navButton { width: 30px; height: 30px; border: 0; border-radius: 10px; background: #07133b; color: white; font-size: 15px; font-weight: 900; }
.navButton:disabled { opacity: .3; }
.navCenter { color: #7a859d; font-size: 12px; font-weight: 900; }
h1 { margin: 0 0 14px; font-size: 24px; line-height: 1.15; font-weight: 900; color: #07133b; letter-spacing: -0.02em; }
h2 { margin: 0 0 14px; font-size: 20px; line-height: 1.15; font-weight: 900; color: #07133b; letter-spacing: -0.02em; }
.whiteCard, .panel { width: 100%; max-width: 100%; overflow: hidden; border-radius: 24px; padding: 16px 14px; margin-bottom: 12px; box-shadow: 0 8px 22px rgba(15, 35, 70, 0.055); }
.whiteCard { background: #fff; border: 1px solid #e1e7f2; }
.panel.blue { background: #eef6ff; border: 1px solid #bcdcff; }
.panel.green { background: #f0fbf1; border: 1px solid #bfeec5; }
.editing { box-shadow: 0 0 0 2px #75baff inset; }
.editingGreen { box-shadow: 0 0 0 2px #7ddc95 inset; }
.summaryCard { padding: 20px 14px 18px; }
.managerLine { margin: -6px 0 12px; color: #68758f; font-size: 15px; font-weight: 700; }
.creatorPill { display: inline-flex; align-items: center; height: 32px; padding: 0 14px; border-radius: 999px; background: #eef1f6; color: #52627f; font-size: 14px; font-weight: 900; margin-bottom: 12px; }
.blockLabel { margin: 0 0 8px; }
.monthInput { text-align: center; }
.chipRow { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px; }
.infoChip { height: 32px; display: inline-flex; align-items: center; padding: 0 12px; border-radius: 999px; background: #f1f4fa; color: #52627f; font-size: 13px; font-weight: 900; white-space: nowrap; }
.formGrid { display: grid; grid-template-columns: 78px minmax(0, 1fr); align-items: center; gap: 9px 10px; width: 100%; max-width: 100%; }
.singleTop { margin-top: 4px; }
label { display: block; min-width: 0; color: #68758f; font-size: 15px; line-height: 1.2; font-weight: 900; }
input, select { display: block; width: 100%; min-width: 0; max-width: 100%; height: 44px; border: 1px solid #cfd8ea; border-radius: 15px; background: #fff; color: #07133b; padding: 0 13px; font-size: 16px; outline: none; box-shadow: none; }
input[type="date"], input[type="month"] { -webkit-appearance: none; appearance: none; min-width: 0; padding-left: 12px; padding-right: 8px; font-size: 15px; }
select { -webkit-appearance: auto; appearance: auto; }
input::placeholder { color: #a8adb8; }
.unitInput { position: relative; width: 100%; min-width: 0; }
.unitInput input { padding-right: 42px; }
.unitInput span { position: absolute; top: 50%; right: 12px; transform: translateY(-50%); color: #07133b; font-size: 13px; font-weight: 800; pointer-events: none; }
.twoGrid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 10px 10px; width: 100%; max-width: 100%; margin-top: 12px; }
.twoGrid > div { min-width: 0; width: 100%; }
.twoGrid label { margin-bottom: 7px; }
.primary, .greenButton, .subButton, .smallPrimary, .smallGhost, .smallDanger { display: inline-flex; align-items: center; justify-content: center; border: 0; font-weight: 900; white-space: nowrap; }
.primary { min-width: 112px; height: 42px; margin-top: 12px; padding: 0 17px; border-radius: 14px; background: #4967e8; color: #fff; font-size: 14px; }
.greenButton { min-width: 112px; height: 42px; margin-top: 12px; padding: 0 17px; border-radius: 14px; background: #40be62; color: #fff; font-size: 14px; }
.subButton { height: 40px; padding: 0 14px; border: 1px solid #d3dceb; border-radius: 13px; background: #fff; color: #07133b; font-size: 13px; }
.buttonRow { display: flex; gap: 9px; align-items: center; flex-wrap: wrap; margin-top: 12px; }
.empty { margin: 0; color: #7b879d; font-size: 13px; font-weight: 700; }
.siteRow { width: 100%; display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 7px; align-items: center; border: 1px solid #e0e6f0; border-radius: 14px; padding: 8px; margin-bottom: 8px; }
.siteText { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.siteText strong, .siteText span { min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.siteText strong { font-size: 14px; }
.siteText span { color: #68758f; font-size: 12px; font-weight: 700; }
.smallPrimary, .smallGhost, .smallDanger { height: 34px; padding: 0 12px; border-radius: 12px; font-size: 12px; }
.smallPrimary { background: #07133b; color: #fff; }
.smallGhost { background: #fff; color: #07133b; border: 1px solid #d3dceb; }
.smallDanger { background: #fff0f0; color: #e33b3b; border: 1px solid #ffc7c7; }
.siteHeaderMini { display: flex; flex-direction: column; gap: 4px; padding: 10px 12px; border-radius: 16px; background: #f6f8fc; margin-bottom: 12px; }
.siteHeaderMini strong { font-size: 15px; }
.siteHeaderMini span { color: #68758f; font-size: 13px; font-weight: 800; }
.workerGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
.workerCard { min-width: 0; text-align: left; border: 1px solid #d3dceb; border-radius: 16px; background: #fff; color: #07133b; padding: 11px; }
.workerCard.active { background: #07133b; color: #fff; border-color: #07133b; }
.workerCard strong, .workerCard span { display: block; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.workerCard strong { font-size: 15px; margin-bottom: 6px; }
.workerCard span { font-size: 11px; font-weight: 800; opacity: .85; line-height: 1.5; }
.logRow { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, .8fr) auto auto auto; align-items: center; gap: 7px; min-height: 46px; padding: 8px; margin-bottom: 8px; border: 1px solid #e4e9f2; border-radius: 16px; background: #fbfcff; }
.logRow strong, .logRow span { min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.logRow strong { font-size: 13px; }
.logRow span { color: #596783; font-size: 13px; font-weight: 700; }
.logRow.material { grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr) auto auto auto; }
.segment { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 4px; border-radius: 16px; background: #f1f4fa; margin-bottom: 12px; }
.segment button { height: 38px; border: 0; border-radius: 12px; background: transparent; color: #52627f; font-weight: 900; }
.segment button.active { background: #07133b; color: white; }
.totalGrid { display: grid; grid-template-columns: 1fr; gap: 8px; margin-bottom: 12px; }
.totalGrid div { border-radius: 18px; background: #fff; border: 1px solid #e1e7f2; padding: 12px 14px; box-shadow: 0 8px 22px rgba(15, 35, 70, 0.045); }
.totalGrid span { display: block; color: #68758f; font-size: 12px; font-weight: 900; margin-bottom: 4px; }
.totalGrid strong { font-size: 20px; color: #07133b; }
.invoiceRow { border: 1px solid #e4e9f2; border-radius: 16px; padding: 10px; margin-bottom: 8px; background: #fbfcff; }
.invoiceRow strong, .invoiceRow span, .invoiceRow b { display: block; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.invoiceRow strong { font-size: 14px; }
.invoiceRow span { color: #596783; font-size: 12px; font-weight: 700; margin-top: 4px; }
.invoiceRow b { font-size: 17px; margin-top: 6px; text-align: right; }
@media (max-width: 390px) {
  .phone { padding-left: 10px; padding-right: 10px; }
  .whiteCard, .panel { border-radius: 22px; padding: 15px 12px; }
  h1 { font-size: 22px; }
  h2 { font-size: 19px; }
  .formGrid { grid-template-columns: 68px minmax(0, 1fr); gap: 8px; }
  label { font-size: 14px; }
  input, select { height: 42px; border-radius: 14px; font-size: 15px; padding-left: 11px; padding-right: 9px; }
  input[type="date"], input[type="month"] { font-size: 14px; padding-left: 10px; padding-right: 5px; }
  .twoGrid { gap: 9px 8px; }
  .primary, .greenButton { height: 40px; font-size: 13px; }
  .logRow, .logRow.material { grid-template-columns: minmax(0, 1fr) auto auto; }
  .logRow span:nth-of-type(1) { display: none; }
}
@media print { .topNav, button { display: none !important; } .phone { max-width: none; padding: 0; } }
`;
