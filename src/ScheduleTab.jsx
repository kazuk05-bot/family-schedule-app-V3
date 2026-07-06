import React from "react";
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Plus, Trash2, Clock, StickyNote, Loader2, Repeat } from "lucide-react";
import { WEEKDAYS, RECUR_LABEL, sameDay, fmtMD } from "./dateUtils";

export default function ScheduleTab({
  groupDoc, groupLoading, groupLoadError, currentMonth, goMonth, goWeek, monthLabel, cells, selected, selectDay, today,
  calendarExpanded, setCalendarExpanded,
  eventsOn, isVisible, toggleFilter, memberOf, selectedLabel, selectedEvents, openAddModal, openEditModal, deleteEvent, setActiveTab,
}) {
  if (groupLoadError) {
    return (
      <div style={{ background: "#F6F1E4", borderRadius: "0 6px 6px 6px", padding: "32px 20px", textAlign: "center", color: "#8A8371", fontSize: 13.5, flex: 1 }}>
        このグループを読み込めませんでした。グループタブから開き直してください。
      </div>
    );
  }
  if (!groupDoc && !groupLoading) {
    return (
      <div style={{ background: "#F6F1E4", borderRadius: "0 6px 6px 6px", padding: "32px 20px", textAlign: "center", flex: 1 }}>
        <div style={{ color: "#6E6A5F", fontSize: 13.5, marginBottom: 12 }}>まだグループが選択されていません</div>
        <button onClick={() => setActiveTab("groups")} className="focus-ring" style={{ background: "#B33A3A", color: "#fff", border: "none", borderRadius: 999, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>グループタブへ</button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>
      <div style={{ background: "#F6F1E4", borderRadius: "0 6px 6px 6px", boxShadow: "0 18px 40px rgba(0,0,0,0.35)", position: "relative", paddingLeft: 26, overflow: "hidden", flexShrink: 0 }}>
        <div aria-hidden="true" style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 26, backgroundColor: "#EAE1C9", borderRight: "1px dashed #C9BB98" }} />
        <div aria-hidden="true" style={{ position: "absolute", left: 6, top: 0, bottom: 0, width: 14, backgroundImage: "repeating-linear-gradient(to bottom, #232134 0px, #232134 6px, transparent 6px, transparent 26px)", backgroundSize: "6px 26px", opacity: 0.85, borderRadius: 3 }} />

        <div style={{ padding: "18px 20px 24px" }}>
          {groupLoading ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#6E6A5F", padding: "40px 0", justifyContent: "center" }}>
              <Loader2 size={18} className="animate-spin" /> 読み込み中…
            </div>
          ) : (
            <>
              <div className="mincho" style={{ fontSize: 13, color: "#8A8371", marginBottom: 10 }}>{groupDoc.name}</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <button onClick={() => (calendarExpanded ? goMonth(-1) : goWeek(-1))} className="focus-ring" aria-label={calendarExpanded ? "前の月" : "前の週"} style={{ padding: 6, borderRadius: 999, border: "1px solid #DDD3BC", background: "#fff8ea", cursor: "pointer" }}><ChevronLeft size={18} color="#2B2A2E" /></button>
                <div className="mincho" style={{ fontSize: 20, fontWeight: 700 }}>{monthLabel}</div>
                <button onClick={() => (calendarExpanded ? goMonth(1) : goWeek(1))} className="focus-ring" aria-label={calendarExpanded ? "次の月" : "次の週"} style={{ padding: 6, borderRadius: 999, border: "1px solid #DDD3BC", background: "#fff8ea", cursor: "pointer" }}><ChevronRight size={18} color="#2B2A2E" /></button>
              </div>

              <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                <button onClick={() => setCalendarExpanded((v) => !v)} className="focus-ring" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 700, color: "#8A8371", background: "none", border: "none", cursor: "pointer", padding: "3px 10px" }}>
                  {calendarExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  {calendarExpanded ? "週表示に戻す" : "月全体を表示"}
                </button>
              </div>

              <div className="chip-scroll" style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto", paddingBottom: 2 }}>
                {groupDoc.members.map((m) => {
                  const on = isVisible(m.id);
                  return (
                    <button key={m.id} onClick={() => toggleFilter(m.id)} className="focus-ring" style={{ flex: "0 0 auto", display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, padding: "5px 10px", borderRadius: 999, cursor: "pointer", border: on ? `1.5px solid ${m.color}` : "1px solid #E2D8BE", background: on ? `${m.color}1c` : "#fff", color: on ? m.color : "#B3AA95", whiteSpace: "nowrap" }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: m.color, opacity: on ? 1 : 0.4, display: "inline-block" }} />{m.name}
                    </button>
                  );
                })}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 4 }}>
                {WEEKDAYS.map((w, i) => (<div key={w} style={{ textAlign: "center", fontSize: 12, fontWeight: 700, padding: "4px 0", color: i === 0 ? "#B33A3A" : i === 6 ? "#3B5E7A" : "#6E6A5F" }}>{w}</div>))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
                {cells.map(({ date, inMonth, key }) => {
                  const isToday = sameDay(date, today);
                  const isSelected = key === selected;
                  const dayEvents = eventsOn(date);
                  const weekday = date.getDay();
                  return (
                    <button key={key} onClick={() => selectDay(key, date)} className="day-cell focus-ring" style={{ aspectRatio: "1 / 1", minHeight: 40, borderRadius: 5, border: isSelected ? "1.5px solid #C8963E" : "1px solid #E7DEC7", background: isSelected ? "#FCF3DC" : inMonth ? "#FFFDF7" : "#F1EBDC", opacity: inMonth ? 1 : 0.55, position: "relative", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", padding: "4px 2px 3px" }}>
                      <span className={isToday ? "stamp-ring" : ""} style={{ fontSize: 12.5, fontWeight: isToday ? 800 : 500, width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: isToday ? "#B33A3A" : weekday === 0 ? "#B33A3A" : weekday === 6 ? "#3B5E7A" : "#2B2A2E" }}>{date.getDate()}</span>
                      <div style={{ display: "flex", gap: 2, marginTop: 3, flexWrap: "wrap", justifyContent: "center", maxWidth: "100%" }}>
                        {dayEvents.slice(0, 4).map((e) => (<span key={e.id} style={{ width: 5, height: 5, borderRadius: "50%", background: memberOf(e.memberId).color, display: "inline-block" }} />))}
                        {dayEvents.length > 4 && <span style={{ fontSize: 8, color: "#6E6A5F" }}>+{dayEvents.length - 4}</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {!groupLoading && (
        <div style={{ background: "#FFFDF7", borderRadius: 6, marginTop: 14, boxShadow: "0 10px 26px rgba(0,0,0,0.28)", display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 12px", flexShrink: 0 }}>
            <div className="mincho" style={{ fontSize: 17, fontWeight: 700 }}>{selectedLabel}</div>
            <button onClick={openAddModal} className="focus-ring" disabled={groupDoc.members.length === 0} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 700, color: "#fff", background: groupDoc.members.length === 0 ? "#D8B9B9" : "#B33A3A", border: "none", borderRadius: 999, padding: "7px 14px", cursor: groupDoc.members.length === 0 ? "not-allowed" : "pointer" }}><Plus size={15} /> 予定を追加</button>
          </div>

          <div className="list-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 20px 18px" }}>
            {groupDoc.members.length === 0 ? (
              <div style={{ color: "#8A8371", fontSize: 13.5, padding: "18px 4px", textAlign: "center", border: "1px dashed #E2D8BE", borderRadius: 6 }}>グループタブからメンバーを追加してください</div>
            ) : selectedEvents.length === 0 ? (
              <div style={{ color: "#8A8371", fontSize: 13.5, padding: "18px 4px", textAlign: "center", border: "1px dashed #E2D8BE", borderRadius: 6 }}>この日の予定はありません</div>
            ) : (
              <ul style={{ display: "flex", flexDirection: "column", gap: 8, margin: 0, padding: 0, listStyle: "none" }}>
                {selectedEvents.map((ev) => {
                  const mem = memberOf(ev.memberId);
                  const multiDay = ev.endDate && ev.endDate !== ev.startDate;
                  return (
                    <li key={ev.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", borderRadius: 6, border: "1px solid #EEE5CE", borderLeft: `4px solid ${mem.color}`, background: "#FFFEFB" }}>
                      <div style={{ flex: 1, cursor: "pointer" }} onClick={() => openEditModal(ev)}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 700, fontSize: 14.5, color: "#2B2A2E" }}>{ev.title}</span>
                          <span style={{ fontSize: 10.5, fontWeight: 700, color: mem.color, background: `${mem.color}18`, borderRadius: 999, padding: "1px 8px" }}>{mem.name}</span>
                          {ev.recurrence && ev.recurrence !== "none" && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: "#8A6A22", background: "#C8963E22", borderRadius: 999, padding: "1px 8px", display: "flex", alignItems: "center", gap: 3 }}><Repeat size={10} />{RECUR_LABEL[ev.recurrence]}</span>
                          )}
                        </div>
                        {(ev.startTime || multiDay) && (
                          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#6E6A5F", marginTop: 3 }}>
                            <Clock size={12} />
                            {multiDay && `${fmtMD(ev.startDate)}〜${fmtMD(ev.endDate)} `}
                            {ev.startTime && (ev.endTime ? `${ev.startTime}〜${ev.endTime}` : ev.startTime)}
                          </div>
                        )}
                        {ev.memo && (
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 4, fontSize: 12.5, color: "#5B5748", marginTop: 4 }}><StickyNote size={12} style={{ marginTop: 2, flexShrink: 0 }} /> <span>{ev.memo}</span></div>
                        )}
                      </div>
                      <button onClick={() => deleteEvent(ev.id)} className="focus-ring" aria-label="削除" style={{ background: "none", border: "none", cursor: "pointer", color: "#8A8371", padding: 4 }}><Trash2 size={16} /></button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
