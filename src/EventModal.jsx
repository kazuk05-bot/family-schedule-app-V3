import React from "react";
import { X, Trash2, Repeat } from "lucide-react";
import { parseDateKey } from "./dateUtils";

const inputStyle = { width: "100%", border: "1px solid #DDD3BC", borderRadius: 5, padding: "8px 10px", fontSize: 14, background: "#fff", boxSizing: "border-box" };
const labelStyle = { display: "block", fontSize: 12, fontWeight: 700, color: "#5B5748", marginBottom: 4 };

export default function EventModal({ groupDoc, editingId, form, setForm, formError, closeModal, saveForm, deleteEvent, setModalOpen }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(20,18,30,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50 }} onClick={closeModal}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#FFFDF7", borderRadius: 8, width: "100%", maxWidth: 400, padding: "20px 20px 18px", boxShadow: "0 20px 50px rgba(0,0,0,0.45)", maxHeight: "88vh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div className="mincho" style={{ fontSize: 17, fontWeight: 700 }}>{editingId ? "予定を編集" : "予定を追加"}</div>
          <button onClick={closeModal} className="focus-ring" aria-label="閉じる" style={{ background: "none", border: "none", cursor: "pointer", color: "#6E6A5F" }}><X size={18} /></button>
        </div>

        <label style={labelStyle}>誰の予定？</label>
        <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
          {groupDoc.members.map((m) => (
            <button key={m.id} onClick={() => setForm((f) => ({ ...f, memberId: m.id }))} className="focus-ring" style={{ fontSize: 12.5, fontWeight: 700, padding: "6px 12px", borderRadius: 999, cursor: "pointer", border: form.memberId === m.id ? `1.5px solid ${m.color}` : "1px solid #E2D8BE", background: form.memberId === m.id ? `${m.color}1c` : "#fff", color: form.memberId === m.id ? m.color : "#6E6A5F" }}>{m.name}</button>
          ))}
        </div>

        <label style={labelStyle}>予定の名前</label>
        <input autoFocus value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="例：歯医者の予約" className="focus-ring" style={{ ...inputStyle, marginBottom: 12 }} />

        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>開始日</label>
            <input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value, endDate: f.endDate < e.target.value ? e.target.value : f.endDate }))} className="focus-ring" style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>終了日</label>
            <input type="date" value={form.endDate} min={form.startDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} className="focus-ring" style={inputStyle} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>開始時刻（任意）</label>
            <input type="time" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} className="focus-ring" style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>終了時刻（任意）</label>
            <input type="time" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} className="focus-ring" style={inputStyle} />
          </div>
        </div>

        <label style={labelStyle}>繰り返し</label>
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          {[{ k: "none", l: "繰り返さない" }, { k: "weekly", l: "毎週" }, { k: "monthly", l: "毎月" }].map((r) => (
            <button key={r.k} onClick={() => setForm((f) => ({ ...f, recurrence: r.k }))} className="focus-ring" style={{ flex: 1, fontSize: 12.5, fontWeight: 700, padding: "7px 0", borderRadius: 6, cursor: "pointer", border: form.recurrence === r.k ? "1.5px solid #C8963E" : "1px solid #E2D8BE", background: form.recurrence === r.k ? "#FCF3DC" : "#fff", color: form.recurrence === r.k ? "#8A6A22" : "#6E6A5F", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
              {r.k !== "none" && <Repeat size={12} />}{r.l}
            </button>
          ))}
        </div>

        {form.recurrence !== "none" && (
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>繰り返しの終了日（任意・空欄なら無期限）</label>
            <input type="date" value={form.recurrenceEndDate} min={form.startDate} onChange={(e) => setForm((f) => ({ ...f, recurrenceEndDate: e.target.value }))} className="focus-ring" style={inputStyle} />
          </div>
        )}

        <label style={labelStyle}>メモ（任意）</label>
        <textarea value={form.memo} onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))} rows={2} placeholder="持ち物、場所など" className="focus-ring" style={{ ...inputStyle, marginBottom: 6, resize: "vertical", fontFamily: "inherit" }} />

        {formError && <div style={{ color: "#B33A3A", fontSize: 12, marginBottom: 8 }}>{formError}</div>}

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          {editingId && (
            <button onClick={() => { deleteEvent(editingId); setModalOpen(false); }} className="focus-ring" aria-label="この予定を削除" style={{ flex: "0 0 auto", border: "1px solid #E2D8BE", background: "#fff", color: "#B33A3A", borderRadius: 6, padding: "9px 12px", cursor: "pointer" }}><Trash2 size={15} /></button>
          )}
          <button onClick={closeModal} className="focus-ring" style={{ flex: 1, border: "1px solid #E2D8BE", background: "#fff", color: "#6E6A5F", borderRadius: 6, padding: "9px 0", cursor: "pointer", fontSize: 13.5, fontWeight: 700 }}>キャンセル</button>
          <button onClick={saveForm} className="focus-ring" style={{ flex: 1, border: "none", background: "#B33A3A", color: "#fff", borderRadius: 6, padding: "9px 0", cursor: "pointer", fontSize: 13.5, fontWeight: 700 }}>保存する</button>
        </div>
      </div>
    </div>
  );
}
