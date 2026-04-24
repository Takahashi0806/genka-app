import React, { useMemo, useState } from "react";

const workers = ["中畑", "伴", "谷上", "藤島", "堀江", "佐藤幸三"];
const managers = ["工藤", "片野", "髙橋", "山野寺", "金子", "こうだい", "マナト"];

const materialOptions = [
  { name: "ラワンランバー", thickness: ["12t", "15t"], sizes: ["3×6", "4×8"], price: 2040 },
  { name: "シナ合板", thickness: ["4t", "5.5t", "9t"], sizes: ["3×6", "4×8"], price: 2800 },
  { name: "ポリ板", thickness: ["2.5t"], sizes: ["3×6", "4×8"], price: 3200 },
  { name: "メラミン", thickness: ["1t"], sizes: ["3×6", "4×8"], price: 4500 },
];

const today = new Date().toISOString().slice(0, 10);

export default function App() {
  const [screen, setScreen] = useState("work");
  const [siteName, setSiteName] = useState("東京大丸夜間工事");
  const [manager, setManager] = useState("工藤");
  const [creator, setCreator] = useState("中畑");

  const [sites, setSites] = useState([
    { id: 1, name: "東京大丸夜間工事", manager: "工藤" },
    { id: 2, name: "札幌駅什器補修", manager: "片野" },
  ]);

  const [selectedSiteId, setSelectedSiteId] = useState(1);

  const [workDate, setWorkDate] = useState(today);
  const [workHours, setWorkHours] = useState("");
  const [workLogs, setWorkLogs] = useState([]);

  const [materialDate, setMaterialDate] = useState(today);
  const [materialName, setMaterialName] = useState("ラワンランバー");
  const [thickness, setThickness] = useState("12t");
  const [size, setSize] = useState("3×6");
  const [qty, setQty] = useState("");
  const [carbon, setCarbon] = useState("2,040");
  const [materialLogs, setMaterialLogs] = useState([]);

  const selectedSite = useMemo(
    () => sites.find((s) => s.id === selectedSiteId),
    [sites, selectedSiteId]
  );

  const selectedMaterial = useMemo(
    () => materialOptions.find((m) => m.name === materialName),
    [materialName]
  );

  function addSite() {
    if (!siteName.trim()) return;
    const newSite = {
      id: Date.now(),
      name: siteName.trim(),
      manager,
    };
    setSites([newSite, ...sites]);
    setSelectedSiteId(newSite.id);
    setScreen("creator");
  }

  function addWork() {
    if (!workDate || !workHours) return;
    setWorkLogs([
      {
        id: Date.now(),
        siteName: selectedSite?.name || "",
        date: workDate,
        hours: workHours,
        creator,
      },
      ...workLogs,
    ]);
    setWorkHours("");
  }

  function addMaterial() {
    if (!materialDate || !qty) return;
    setMaterialLogs([
      {
        id: Date.now(),
        siteName: selectedSite?.name || "",
        date: materialDate,
        name: materialName,
        thickness,
        size,
        qty,
        carbon,
        creator,
      },
      ...materialLogs,
    ]);
    setQty("");
  }

  function changeMaterial(name) {
    const mat = materialOptions.find((m) => m.name === name);
    setMaterialName(name);
    if (mat) {
      setThickness(mat.thickness[0]);
      setSize(mat.sizes[0]);
      setCarbon(mat.price.toLocaleString());
    }
  }

  return (
    <div className="app">
      <style>{css}</style>

      <main className="phone">
        <header className="topBar">
          <button onClick={() => setScreen("site")}>‹</button>
          <div>
            <p className="sub">現場原価管理</p>
            <h1>{screenTitle(screen)}</h1>
          </div>
          <button onClick={() => setScreen(nextScreen(screen))}>›</button>
        </header>

        {screen === "site" && (
          <>
            <section className="card blue">
              <h2>現場登録</h2>

              <div className="formGrid">
                <label>現場名</label>
                <input
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  placeholder="例：東京大丸夜間工事"
                />

                <label>担当者</label>
                <select value={manager} onChange={(e) => setManager(e.target.value)}>
                  {managers.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </div>

              <button className="primary" onClick={addSite}>
                現場を追加
              </button>
            </section>

            <section className="listCard">
              <h2>登録済み現場</h2>
              {sites.map((s) => (
                <button
                  key={s.id}
                  className="siteRow"
                  onClick={() => {
                    setSelectedSiteId(s.id);
                    setScreen("creator");
                  }}
                >
                  <span>{s.name}</span>
                  <small>{s.manager}</small>
                </button>
              ))}
            </section>
          </>
        )}

        {screen === "creator" && (
          <section className="card blue">
            <h2>制作者選択</h2>
            <p className="currentSite">{selectedSite?.name}</p>

            <div className="workerGrid">
              {workers.map((w) => (
                <button
                  key={w}
                  className={creator === w ? "worker active" : "worker"}
                  onClick={() => {
                    setCreator(w);
                    setScreen("work");
                  }}
                >
                  {w}
                </button>
              ))}
            </div>
          </section>
        )}

        {screen === "work" && (
          <>
            <section className="card blue">
              <h2>作業追加</h2>

              <div className="formGrid">
                <label>日付</label>
                <input
                  type="date"
                  value={workDate}
                  onChange={(e) => setWorkDate(e.target.value)}
                />

                <label>作業時間</label>
                <input
                  inputMode="decimal"
                  value={workHours}
                  onChange={(e) => setWorkHours(e.target.value)}
                  placeholder="例：4"
                />

                <label>制作者</label>
                <select value={creator} onChange={(e) => setCreator(e.target.value)}>
                  {workers.map((w) => (
                    <option key={w}>{w}</option>
                  ))}
                </select>
              </div>

              <button className="primary" onClick={addWork}>
                作業を追加
              </button>
            </section>

            <section className="card green">
              <h2>材料追加</h2>

              <div className="formGrid">
                <label>日付</label>
                <input
                  type="date"
                  value={materialDate}
                  onChange={(e) => setMaterialDate(e.target.value)}
                />

                <label>材質</label>
                <select value={materialName} onChange={(e) => changeMaterial(e.target.value)}>
                  {materialOptions.map((m) => (
                    <option key={m.name}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div className="twoGrid">
                <div>
                  <label>厚み</label>
                  <select value={thickness} onChange={(e) => setThickness(e.target.value)}>
                    {(selectedMaterial?.thickness || []).map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>サイズ</label>
                  <select value={size} onChange={(e) => setSize(e.target.value)}>
                    {(selectedMaterial?.sizes || []).map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>枚</label>
                  <input
                    inputMode="decimal"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    placeholder="例：2.0"
                  />
                </div>

                <div>
                  <label>炭水化物</label>
                  <input value={carbon} onChange={(e) => setCarbon(e.target.value)} />
                </div>
              </div>

              <button className="primary" onClick={addMaterial}>
                素材を追加
              </button>
            </section>

            <section className="listCard">
              <h2>追加済み作業</h2>
              {workLogs.length === 0 && <p className="empty">まだ作業はありません</p>}
              {workLogs.map((w) => (
                <div key={w.id} className="logRow">
                  <span>{w.date}</span>
                  <span>{w.creator}</span>
                  <strong>{w.hours}h</strong>
                </div>
              ))}
            </section>

            <section className="listCard">
              <h2>追加済み材料</h2>
              {materialLogs.length === 0 && <p className="empty">まだ材料はありません</p>}
              {materialLogs.map((m) => (
                <div key={m.id} className="logRow material">
                  <span>{m.date}</span>
                  <span>
                    {m.name} {m.thickness} {m.size}
                  </span>
                  <strong>{m.qty}枚</strong>
                </div>
              ))}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function screenTitle(screen) {
  if (screen === "site") return "現場登録";
  if (screen === "creator") return "制作者選択";
  return "作業・材料登録";
}

function nextScreen(screen) {
  if (screen === "site") return "creator";
  if (screen === "creator") return "work";
  return "site";
}

const css = `
* {
  box-sizing: border-box;
}

html,
body,
#root {
  width: 100%;
  min-height: 100%;
  margin: 0;
  overflow-x: hidden;
  background: #f3f6fb;
  color: #07133b;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

button,
input,
select {
  font: inherit;
}

.app {
  width: 100%;
  min-height: 100vh;
  overflow-x: hidden;
  background: linear-gradient(180deg, #f8fbff 0%, #eef3f8 100%);
}

.phone {
  width: 100%;
  max-width: 430px;
  margin: 0 auto;
  padding: 10px 14px 80px;
  overflow-x: hidden;
}

.topBar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
  padding: 8px 2px;
}

.topBar button {
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 50%;
  background: #e7eef9;
  color: #304160;
  font-size: 22px;
  line-height: 1;
}

.topBar div {
  min-width: 0;
  text-align: center;
}

.sub {
  margin: 0;
  font-size: 10px;
  color: #73809a;
  font-weight: 700;
}

h1 {
  margin: 0;
  font-size: 16px;
  line-height: 1.2;
  font-weight: 900;
  color: #07133b;
}

.card,
.listCard {
  width: 100%;
  max-width: 100%;
  overflow: hidden;
  border-radius: 24px;
  padding: 18px 14px;
  margin-bottom: 14px;
  box-shadow: 0 8px 22px rgba(15, 35, 70, 0.06);
}

.card.blue {
  background: #eef6ff;
  border: 1px solid #cfe0ff;
}

.card.green {
  background: #f0fbf1;
  border: 1px solid #ccefcc;
}

.listCard {
  background: #ffffff;
  border: 1px solid #e1e7f2;
}

h2 {
  margin: 0 0 16px;
  font-size: 22px;
  line-height: 1.15;
  font-weight: 900;
  color: #07133b;
}

.formGrid {
  display: grid;
  grid-template-columns: 74px minmax(0, 1fr);
  align-items: center;
  gap: 10px 10px;
  width: 100%;
  max-width: 100%;
}

label {
  display: block;
  min-width: 0;
  font-size: 15px;
  line-height: 1.2;
  color: #68758f;
  font-weight: 900;
}

input,
select {
  display: block;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  height: 46px;
  border: 1px solid #cfd8ea;
  border-radius: 15px;
  background: #ffffff;
  color: #07133b;
  padding: 0 14px;
  font-size: 16px;
  outline: none;
  box-shadow: none;
}

input[type="date"] {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  text-align: left;
  padding-left: 14px;
  padding-right: 8px;
  font-size: 16px;
}

select {
  -webkit-appearance: auto;
  appearance: auto;
}

input::placeholder {
  color: #a8adb8;
}

.twoGrid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px 10px;
  width: 100%;
  max-width: 100%;
  margin-top: 14px;
}

.twoGrid > div {
  min-width: 0;
  width: 100%;
}

.twoGrid label {
  margin-bottom: 7px;
}

.primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 112px;
  max-width: 100%;
  height: 44px;
  margin-top: 14px;
  padding: 0 18px;
  border: 0;
  border-radius: 15px;
  background: #4967e8;
  color: #ffffff;
  font-size: 15px;
  font-weight: 900;
  white-space: nowrap;
}

.currentSite {
  margin: -4px 0 14px;
  padding: 10px 12px;
  border-radius: 14px;
  background: #ffffff;
  border: 1px solid #d5def0;
  font-size: 14px;
  font-weight: 800;
}

.workerGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.worker {
  min-width: 0;
  height: 44px;
  border: 1px solid #d0daed;
  border-radius: 14px;
  background: #ffffff;
  color: #07133b;
  font-weight: 900;
}

.worker.active {
  background: #4967e8;
  color: #ffffff;
  border-color: #4967e8;
}

.siteRow {
  width: 100%;
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 10px;
  margin-bottom: 8px;
  border: 1px solid #e0e6f0;
  border-radius: 12px;
  background: #ffffff;
  text-align: left;
}

.siteRow span {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 13px;
  font-weight: 900;
}

.siteRow small {
  font-size: 11px;
  color: #69768f;
  font-weight: 800;
}

.logRow {
  display: grid;
  grid-template-columns: 86px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  min-height: 34px;
  padding: 7px 8px;
  margin-bottom: 7px;
  border: 1px solid #e4e9f2;
  border-radius: 12px;
  background: #fbfcff;
  font-size: 12px;
}

.logRow span {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.logRow strong {
  white-space: nowrap;
}

.empty {
  margin: 0;
  color: #7b879d;
  font-size: 13px;
  font-weight: 700;
}

@media (max-width: 390px) {
  .phone {
    padding-left: 10px;
    padding-right: 10px;
  }

  .card,
  .listCard {
    border-radius: 22px;
    padding: 16px 12px;
  }

  h2 {
    font-size: 20px;
  }

  .formGrid {
    grid-template-columns: 66px minmax(0, 1fr);
    gap: 9px 8px;
  }

  label {
    font-size: 14px;
  }

  input,
  select {
    height: 43px;
    border-radius: 14px;
    font-size: 15px;
    padding-left: 12px;
    padding-right: 10px;
  }

  input[type="date"] {
    font-size: 15px;
    padding-left: 12px;
    padding-right: 6px;
  }

  .twoGrid {
    gap: 10px 8px;
  }

  .primary {
    height: 42px;
    font-size: 14px;
    border-radius: 14px;
  }
}
`;