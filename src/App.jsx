import React, { useState } from "react";

const APP_VERSION = "v2.7.0";

export default function App() {
  const [workDate, setWorkDate] = useState("");
  const [materialDate, setMaterialDate] = useState("");

  return (
    <>
      {/* ===== バージョン表示 ===== */}
      <div style={{
        position: "fixed",
        top: 6,
        left: 8,
        zIndex: 9999,
        fontSize: 11,
        color: "#666",
        background: "#fff",
        padding: "2px 6px",
        borderRadius: 6,
        border: "1px solid #ddd"
      }}>
        {APP_VERSION}
      </div>

      {/* ===== 本体 ===== */}
      <div style={styles.app}>

        <h1 style={styles.title}>作業・材料登録</h1>

        {/* ===== 作業 ===== */}
        <div style={styles.card}>
          <div style={styles.section}>作業追加</div>

          <div style={styles.row}>
            <label style={styles.label}>日付</label>
            <input
              type="date"
              value={workDate}
              onChange={(e) => setWorkDate(e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={styles.row}>
            <label style={styles.label}>時間</label>
            <input type="number" style={styles.input}/>
          </div>

          <button style={styles.button}>作業を追加</button>
        </div>

        {/* ===== 材料 ===== */}
        <div style={styles.card}>
          <div style={styles.section}>材料追加</div>

          <div style={styles.row}>
            <label style={styles.label}>日付</label>
            <input
              type="date"
              value={materialDate}
              onChange={(e) => setMaterialDate(e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={styles.grid2}>
            <input placeholder="厚み" style={styles.input}/>
            <input placeholder="サイズ" style={styles.input}/>
            <input placeholder="枚数" style={styles.input}/>
            <input placeholder="単価" style={styles.input}/>
          </div>

          <button style={styles.button}>材料を追加</button>
        </div>

      </div>
    </>
  );
}

const styles = {
  app: {
    padding: 12,
    maxWidth: 420,
    margin: "0 auto",
  },

  title: {
    fontSize: 18,
    marginBottom: 10,
  },

  card: {
    background: "#fff",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    border: "1px solid #e5e5e5",
  },

  section: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: "bold"
  },

  row: {
    display: "grid",
    gridTemplateColumns: "44px 1fr",
    gap: 6,
    marginBottom: 8,
    alignItems: "center"
  },

  label: {
    fontSize: 12,
  },

  input: {
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    height: 40,
    fontSize: 14,
    boxSizing: "border-box"
  },

  grid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 6,
    marginBottom: 8
  },

  button: {
    width: "100%",
    height: 40,
    fontSize: 14,
    background: "#333",
    color: "#fff",
    border: "none",
    borderRadius: 8
  }
};