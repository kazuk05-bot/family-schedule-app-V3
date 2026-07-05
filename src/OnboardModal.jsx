import React from "react";

const inputStyle = { width: "100%", border: "1px solid #DDD3BC", borderRadius: 5, padding: "8px 10px", fontSize: 14, background: "#fff", boxSizing: "border-box" };

export default function OnboardModal({ groupDoc, onboardName, setOnboardName, chooseExisting, addSelfAsNew }) {
  if (!groupDoc) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(20,18,30,0.65)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 60 }}>
      <div style={{ background: "#FFFDF7", borderRadius: 8, width: "100%", maxWidth: 360, padding: "22px 20px", boxShadow: "0 20px 50px rgba(0,0,0,0.45)" }}>
        <div className="mincho" style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>あなたはどなたですか？</div>
        <div style={{ fontSize: 12, color: "#8A8371", marginBottom: 14 }}>「{groupDoc.name}」であなた自身を選んでください</div>

        {groupDoc.members.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
            {groupDoc.members.map((m) => (
              <button key={m.id} onClick={() => chooseExisting(m.id)} className="focus-ring" style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 6, border: "1px solid #E2D8BE", background: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#2B2A2E" }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: m.color, display: "inline-block" }} />{m.name}
              </button>
            ))}
          </div>
        )}

        <div style={{ fontSize: 12, fontWeight: 700, color: "#5B5748", marginBottom: 6 }}>
          {groupDoc.members.length > 0 ? "リストにいない場合は新しく追加：" : "名前を入力して追加してください："}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <input value={onboardName} onChange={(e) => setOnboardName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addSelfAsNew()} placeholder="例：太郎" className="focus-ring" style={inputStyle} />
          <button onClick={addSelfAsNew} className="focus-ring" style={{ border: "none", background: "#B33A3A", color: "#fff", borderRadius: 5, padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>追加</button>
        </div>
      </div>
    </div>
  );
}
