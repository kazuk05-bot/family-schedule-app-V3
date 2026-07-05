import React, { useState, useEffect, useMemo } from "react";
import {
  ChevronLeft, ChevronRight, Plus, X, Trash2, Clock, StickyNote,
  Check, Repeat, Users, LogOut, Copy, UserPlus, CalendarDays, Info,
} from "lucide-react";

/* ---------- palette ----------
  desk (bg):  #232134   paper: #F6F1E4   ink: #2B2A2E
  stamp(hanko): #B33A3A   gold: #C8963E
  member colors cycle through MEMBER_COLORS

  NOTE: This artifact is a UX demo. All data (groups / members / events)
  lives only in React state for this session - nothing is written to
  window.storage. That means it always works the same way regardless of
  plan or publish status, but a page reload resets everything. The
  Firebase version is the one with real persistence.
--------------------------------- */

const MEMBER_COLORS = ["#B33A3A", "#3B6E5E", "#3B5E7A", "#C8963E", "#7C5AA6", "#A6763A", "#5C7A3B", "#A63B6B"];
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid confusion

function pad(n) { return String(n).padStart(2, "0"); }
function dateKey(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function parseDateKey(s) { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); }
function sameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
function daysBetween(a, b) { return Math.round((b - a) / 86400000); }
function addMonthsClamped(d, n) {
  const idx = d.getMonth() + n;
  const year = d.getFullYear() + Math.floor(idx / 12);
  const month = ((idx % 12) + 12) % 12;
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(d.getDate(), lastDay));
}
function makeId() { return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }
function makeGroupCode() {
  let s = "";
  for (let i = 0; i < 6; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return s;
}
function nextColor(members) { return MEMBER_COLORS[members.length % MEMBER_COLORS.length]; }

// Does an event (possibly recurring, possibly multi-day) occur on `date`?
function occursOn(ev, date) {
  const start = parseDateKey(ev.startDate);
  const end = parseDateKey(ev.endDate || ev.startDate);
  const spanDays = Math.max(0, daysBetween(start, end));
  if (!ev.recurrence || ev.recurrence === "none") {
    return date >= start && date <= end;
  }
  if (date < start) return false;
  const recEnd = ev.recurrenceEndDate ? parseDateKey(ev.recurrenceEndDate) : null;
  if (ev.recurrence === "weekly") {
    const offset = daysBetween(start, date);
    const k = Math.floor(offset / 7);
    const occStart = addDays(start, k * 7);
    if (recEnd && occStart > recEnd) return false;
    const occEnd = addDays(occStart, spanDays);
    return date >= occStart && date <= occEnd;
  }
  if (ev.recurrence === "monthly") {
    const monthsOffset = (date.getFullYear() - start.getFullYear()) * 12 + (date.getMonth() - start.getMonth());
    for (const mo of [monthsOffset - 1, monthsOffset]) {
      if (mo < 0) continue;
      const occStart = addMonthsClamped(start, mo);
      if (recEnd && occStart > recEnd) continue;
      const occEnd = addDays(occStart, spanDays);
      if (date >= occStart && date <= occEnd) return true;
    }
    return false;
  }
  return false;
}

function fmtMD(dateStr) {
  const d = parseDateKey(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

const RECUR_LABEL = { weekly: "毎週", monthly: "毎月" };

function emptyForm(todayKey) {
  return { title: "", startDate: todayKey, endDate: todayKey, startTime: "", endTime: "", recurrence: "none", recurrenceEndDate: "", memo: "", memberId: null };
}

export default function ScheduleApp() {
  const today = new Date();
  const todayKey = dateKey(today);

  const [activeTab, setActiveTab] = useState("groups"); // 'groups' | 'schedule'

  // in-memory "backend": code -> { name, code, members, events }
  const [groupsDb, setGroupsDb] = useState({});
  const [profile, setProfile] = useState({ myGroups: [], activeGroupId: null, myMemberIds: {} });

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [newMemberName, setNewMemberName] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);

  const [onboardOpen, setOnboardOpen] = useState(false);
  const [onboardName, setOnboardName] = useState("");

  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(todayKey);
  const [filterIds, setFilterIds] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(() => emptyForm(todayKey));
  const [formError, setFormError] = useState("");

  const groupDoc = profile.activeGroupId ? groupsDb[profile.activeGroupId] || null : null;

  useEffect(() => { setFilterIds(null); }, [profile.activeGroupId]);

  // re-check "who am I" whenever the active group's data or profile changes
  useEffect(() => {
    if (!groupDoc || !profile.activeGroupId) return;
    const myId = profile.myMemberIds ? profile.myMemberIds[profile.activeGroupId] : null;
    const stillExists = myId && groupDoc.members.some((m) => m.id === myId);
    setOnboardOpen(!stillExists);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupDoc, profile.activeGroupId, profile.myMemberIds]);

  function writeGroup(nextDoc) {
    setGroupsDb((prev) => ({ ...prev, [nextDoc.code]: nextDoc }));
  }

  // ---- create / join / switch / leave groups ----
  function createGroup() {
    const name = createName.trim();
    if (!name) return;
    let code = makeGroupCode();
    while (groupsDb[code]) code = makeGroupCode();
    const newDoc = { name, code, members: [], events: [] };
    writeGroup(newDoc);
    setProfile((p) => ({ ...p, myGroups: [...p.myGroups, { id: code, name }], activeGroupId: code }));
    setCreateOpen(false);
    setCreateName("");
    setActiveTab("schedule");
  }

  function joinGroup() {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    const target = groupsDb[code];
    if (!target) {
      setJoinError("このプレビュー内で作成されたグループが見つかりませんでした。招待コードをご確認ください");
      return;
    }
    const already = profile.myGroups.some((g) => g.id === code);
    const nextProfile = {
      ...profile,
      myGroups: already ? profile.myGroups : [...profile.myGroups, { id: code, name: target.name }],
      activeGroupId: code,
    };
    setProfile(nextProfile);
    setJoinOpen(false);
    setJoinCode("");
    setJoinError("");
    const myId = nextProfile.myMemberIds ? nextProfile.myMemberIds[code] : null;
    const stillExists = myId && target.members.some((m) => m.id === myId);
    if (!stillExists) setOnboardOpen(true);
    else setActiveTab("schedule");
  }

  function selectGroup(id) {
    if (id === profile.activeGroupId) {
      setActiveTab("schedule");
      return;
    }
    setProfile((p) => ({ ...p, activeGroupId: id }));
    setActiveTab("schedule");
  }

  function leaveGroup(id, name) {
    if (!window.confirm(`「${name}」から退出しますか？(グループ自体は削除されません)`)) return;
    setProfile((p) => {
      const nextMemberIds = { ...p.myMemberIds };
      delete nextMemberIds[id];
      return {
        ...p,
        myGroups: p.myGroups.filter((g) => g.id !== id),
        activeGroupId: p.activeGroupId === id ? null : p.activeGroupId,
        myMemberIds: nextMemberIds,
      };
    });
  }

  function copyCode(code) {
    try {
      navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 1500);
    } catch (e) {
      /* clipboard unavailable in this environment */
    }
  }

  // ---- onboarding: who am I within the active group ----
  function chooseExisting(memberId) {
    const id = groupDoc.code;
    setProfile((p) => ({ ...p, myMemberIds: { ...p.myMemberIds, [id]: memberId } }));
    setOnboardOpen(false);
    setOnboardName("");
    setActiveTab("schedule");
  }
  function addSelfAsNew() {
    const name = onboardName.trim();
    if (!name || !groupDoc) return;
    const newMember = { id: makeId(), name, color: nextColor(groupDoc.members) };
    writeGroup({ ...groupDoc, members: [...groupDoc.members, newMember] });
    setProfile((p) => ({ ...p, myMemberIds: { ...p.myMemberIds, [groupDoc.code]: newMember.id } }));
    setOnboardOpen(false);
    setOnboardName("");
    setActiveTab("schedule");
  }

  // ---- manage members of the active group ----
  function addMember() {
    const name = newMemberName.trim();
    if (!name || !groupDoc) return;
    const newMember = { id: makeId(), name, color: nextColor(groupDoc.members) };
    writeGroup({ ...groupDoc, members: [...groupDoc.members, newMember] });
    setNewMemberName("");
  }
  function deleteMember(id) {
    if (!groupDoc) return;
    const m = groupDoc.members.find((x) => x.id === id);
    if (!window.confirm(`「${m ? m.name : ""}」をメンバーから削除しますか？\n(この方の予定は残りますが「不明」として表示されます)`)) return;
    writeGroup({ ...groupDoc, members: groupDoc.members.filter((x) => x.id !== id) });
    const myId = profile.myMemberIds ? profile.myMemberIds[groupDoc.code] : null;
    if (myId === id) {
      setProfile((p) => {
        const nextMemberIds = { ...p.myMemberIds };
        delete nextMemberIds[groupDoc.code];
        return { ...p, myMemberIds: nextMemberIds };
      });
    }
  }

  function memberOf(id) {
    if (!groupDoc) return { id, name: "不明", color: "#8A8371" };
    return groupDoc.members.find((m) => m.id === id) || { id, name: "不明", color: "#8A8371" };
  }
  const myId = groupDoc ? (profile.myMemberIds ? profile.myMemberIds[groupDoc.code] : null) : null;

  function toggleFilter(id) {
    setFilterIds((prev) => {
      const s = prev === null ? new Set(groupDoc.members.map((m) => m.id)) : new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  }
  function isVisible(id) { return filterIds === null || filterIds.has(id); }

  // ---- calendar grid ----
  const cells = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const startOffset = firstOfMonth.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
    const arr = [];
    for (let i = 0; i < totalCells; i++) {
      const dayNum = i - startOffset + 1;
      const d = new Date(year, month, dayNum);
      arr.push({ date: d, inMonth: d.getMonth() === month, key: dateKey(d) });
    }
    return arr;
  }, [currentMonth]);

  const monthLabel = `${currentMonth.getFullYear()}年 ${currentMonth.getMonth() + 1}月`;
  function goMonth(delta) { setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1)); }
  function selectDay(key, date) {
    setSelected(key);
    if (date.getMonth() !== currentMonth.getMonth() || date.getFullYear() !== currentMonth.getFullYear()) {
      setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    }
  }

  function eventsOn(dateObj) {
    if (!groupDoc) return [];
    return groupDoc.events.filter((e) => occursOn(e, dateObj) && isVisible(e.memberId));
  }

  const selectedDate = useMemo(() => parseDateKey(selected), [selected]);
  const selectedLabel = `${selectedDate.getMonth() + 1}月${selectedDate.getDate()}日（${WEEKDAYS[selectedDate.getDay()]}）`;
  const selectedEvents = useMemo(() => {
    return eventsOn(selectedDate).sort((a, b) => {
      if (!a.startTime && !b.startTime) return 0;
      if (!a.startTime) return 1;
      if (!b.startTime) return -1;
      return a.startTime.localeCompare(b.startTime);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupDoc, selected, filterIds]);

  function openAddModal() {
    setEditingId(null);
    setForm({ ...emptyForm(todayKey), startDate: selected, endDate: selected, memberId: myId || (groupDoc.members[0] && groupDoc.members[0].id) || null });
    setFormError("");
    setModalOpen(true);
  }
  function openEditModal(ev) {
    setEditingId(ev.id);
    setForm({
      title: ev.title, startDate: ev.startDate, endDate: ev.endDate || ev.startDate,
      startTime: ev.startTime || "", endTime: ev.endTime || "",
      recurrence: ev.recurrence || "none", recurrenceEndDate: ev.recurrenceEndDate || "",
      memo: ev.memo || "", memberId: ev.memberId,
    });
    setFormError("");
    setModalOpen(true);
  }
  function closeModal() { setModalOpen(false); }

  function saveForm() {
    if (!form.title.trim()) { setFormError("予定の名前を入力してください"); return; }
    if (!form.memberId) { setFormError("誰の予定か選んでください"); return; }
    if (parseDateKey(form.endDate) < parseDateKey(form.startDate)) { setFormError("終了日は開始日より後にしてください"); return; }
    const payload = { ...form, title: form.title.trim() };
    let nextEvents;
    if (editingId) {
      nextEvents = groupDoc.events.map((e) => (e.id === editingId ? { ...e, ...payload } : e));
    } else {
      nextEvents = [...groupDoc.events, { id: makeId(), ...payload }];
    }
    writeGroup({ ...groupDoc, events: nextEvents });
    setModalOpen(false);
  }
  function deleteEvent(id) {
    writeGroup({ ...groupDoc, events: groupDoc.events.filter((e) => e.id !== id) });
  }

  const inputStyle = { width: "100%", border: "1px solid #DDD3BC", borderRadius: 5, padding: "8px 10px", fontSize: 14, background: "#fff", boxSizing: "border-box" };
  const labelStyle = { display: "block", fontSize: 12, fontWeight: 700, color: "#5B5748", marginBottom: 4 };

  return (
    <div style={{ minHeight: "100vh", background: "#232134", backgroundImage: "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.03), transparent 40%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.025), transparent 45%)", fontFamily: "'Noto Sans JP', sans-serif", color: "#2B2A2E", padding: "24px 12px 60px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;700;800&family=Noto+Sans+JP:wght@400;500;700&display=swap');
        .mincho { font-family: 'Shippori Mincho', serif; }
        .stamp-ring { box-shadow: 0 0 0 1.5px #B33A3A, 0 0 0 4px rgba(179,58,58,0.15); }
        @media (prefers-reduced-motion: no-preference) { .day-cell { transition: transform .12s ease; } .day-cell:hover { transform: translateY(-1px); } }
        .focus-ring:focus-visible { outline: 2px solid #C8963E; outline-offset: 2px; }
        .chip-scroll::-webkit-scrollbar { height: 5px; }
        .chip-scroll::-webkit-scrollbar-thumb { background: #DCD2B8; border-radius: 4px; }
      `}</style>

      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 4, padding: "0 6px" }}>
          <h1 className="mincho" style={{ color: "#F6F1E4", fontSize: 26, fontWeight: 800, letterSpacing: "0.04em" }}>予定手帳</h1>
          <span style={{ color: "#C8963E", fontSize: 12, letterSpacing: "0.15em" }}>SCHEDULE&nbsp;DIARY</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "0 6px", marginBottom: 12 }}>
          <Info size={12} color="rgba(246,241,228,0.5)" />
          <span style={{ color: "rgba(246,241,228,0.5)", fontSize: 11 }}>動作確認用プレビューです。データはこの画面を閉じる／更新すると消えます</span>
        </div>

        {/* tab bar */}
        <div style={{ display: "flex", gap: 6, padding: "0 6px", marginBottom: 12 }}>
          {[{ key: "groups", label: "グループ", icon: Users }, { key: "schedule", label: "予定表", icon: CalendarDays }].map((t) => {
            const Icon = t.icon;
            const on = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className="focus-ring"
                style={{
                  flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  padding: "10px 0", borderRadius: "6px 6px 0 0", border: "none", cursor: "pointer",
                  fontSize: 14, fontWeight: 700,
                  background: on ? "#F6F1E4" : "rgba(246,241,228,0.14)",
                  color: on ? "#B33A3A" : "rgba(246,241,228,0.7)",
                }}
              >
                <Icon size={15} /> {t.label}
              </button>
            );
          })}
        </div>

        {activeTab === "groups" ? (
          <GroupsTab
            profile={profile} groupDoc={groupDoc} myId={myId}
            createOpen={createOpen} setCreateOpen={setCreateOpen} createName={createName} setCreateName={setCreateName} createGroup={createGroup}
            joinOpen={joinOpen} setJoinOpen={setJoinOpen} joinCode={joinCode} setJoinCode={setJoinCode} joinError={joinError} joinGroup={joinGroup}
            selectGroup={selectGroup} leaveGroup={leaveGroup} copyCode={copyCode} copiedCode={copiedCode}
            newMemberName={newMemberName} setNewMemberName={setNewMemberName} addMember={addMember} deleteMember={deleteMember}
          />
        ) : (
          <ScheduleTab
            groupDoc={groupDoc}
            currentMonth={currentMonth} goMonth={goMonth} monthLabel={monthLabel}
            cells={cells} selected={selected} selectDay={selectDay} today={today}
            eventsOn={eventsOn} isVisible={isVisible} toggleFilter={toggleFilter} memberOf={memberOf}
            selectedLabel={selectedLabel} selectedEvents={selectedEvents}
            openAddModal={openAddModal} openEditModal={openEditModal} deleteEvent={deleteEvent}
            setActiveTab={setActiveTab}
          />
        )}
      </div>

      {/* onboarding: who are you within this group */}
      {onboardOpen && groupDoc && (
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
            <div style={{ fontSize: 12, fontWeight: 700, color: "#5B5748", marginBottom: 6 }}>{groupDoc.members.length > 0 ? "リストにいない場合は新しく追加：" : "名前を入力して追加してください："}</div>
            <div style={{ display: "flex", gap: 6 }}>
              <input value={onboardName} onChange={(e) => setOnboardName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addSelfAsNew()} placeholder="例：太郎" className="focus-ring" style={inputStyle} />
              <button onClick={addSelfAsNew} className="focus-ring" style={{ border: "none", background: "#B33A3A", color: "#fff", borderRadius: 5, padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>追加</button>
            </div>
          </div>
        </div>
      )}

      {/* add/edit event modal */}
      {modalOpen && groupDoc && (
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
      )}
    </div>
  );
}

function GroupsTab({
  profile, groupDoc, myId, createOpen, setCreateOpen, createName, setCreateName, createGroup,
  joinOpen, setJoinOpen, joinCode, setJoinCode, joinError, joinGroup,
  selectGroup, leaveGroup, copyCode, copiedCode, newMemberName, setNewMemberName, addMember, deleteMember,
}) {
  const inputStyle = { width: "100%", border: "1px solid #DDD3BC", borderRadius: 5, padding: "8px 10px", fontSize: 14, background: "#fff", boxSizing: "border-box" };
  return (
    <div style={{ background: "#F6F1E4", borderRadius: "0 6px 6px 6px", boxShadow: "0 18px 40px rgba(0,0,0,0.35)", padding: "20px 20px 22px" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button onClick={() => setCreateOpen(true)} className="focus-ring" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "#B33A3A", color: "#fff", border: "none", borderRadius: 6, padding: "10px 0", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}><Plus size={15} /> グループを作成</button>
        <button onClick={() => setJoinOpen(true)} className="focus-ring" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "#fff", color: "#5B5748", border: "1px solid #DDD3BC", borderRadius: 6, padding: "10px 0", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}><UserPlus size={15} /> コードで参加</button>
      </div>

      <div className="mincho" style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>参加中のグループ</div>
      {profile.myGroups.length === 0 ? (
        <div style={{ color: "#8A8371", fontSize: 13.5, padding: "18px 4px", textAlign: "center", border: "1px dashed #E2D8BE", borderRadius: 6 }}>まだグループがありません。「グループを作成」から試してみてください</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {profile.myGroups.map((g) => {
            const isActive = g.id === profile.activeGroupId;
            return (
              <div key={g.id} style={{ border: isActive ? "1.5px solid #C8963E" : "1px solid #E2D8BE", borderRadius: 8, padding: "12px 14px", background: "#FFFDF7" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#2B2A2E" }}>{g.name}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                      <span style={{ fontSize: 11, color: "#8A8371" }}>招待コード:</span>
                      <span style={{ fontFamily: "monospace", fontSize: 12.5, fontWeight: 700, letterSpacing: "0.06em", color: "#5B5748" }}>{g.id}</span>
                      <button onClick={() => copyCode(g.id)} className="focus-ring" aria-label="コードをコピー" style={{ background: "none", border: "none", cursor: "pointer", color: "#8A8371", padding: 2 }}><Copy size={12} /></button>
                      {copiedCode && <span style={{ fontSize: 10.5, color: "#3B6E5E" }}>コピーしました</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    {isActive ? (
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#C8963E", border: "1px solid #C8963E", borderRadius: 999, padding: "4px 10px" }}>選択中</span>
                    ) : (
                      <button onClick={() => selectGroup(g.id)} className="focus-ring" style={{ fontSize: 12, fontWeight: 700, color: "#fff", background: "#3B5E7A", border: "none", borderRadius: 999, padding: "5px 12px", cursor: "pointer" }}>開く</button>
                    )}
                    <button onClick={() => leaveGroup(g.id, g.name)} className="focus-ring" aria-label="退出" style={{ background: "none", border: "none", cursor: "pointer", color: "#8A8371" }}><LogOut size={16} /></button>
                  </div>
                </div>

                {isActive && groupDoc && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px dashed #E2D8BE" }}>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: "#5B5748", marginBottom: 6 }}>メンバー</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 10 }}>
                      {groupDoc.members.map((m) => (
                        <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 9px", borderRadius: 6, border: "1px solid #EEE5CE" }}>
                          <span style={{ width: 9, height: 9, borderRadius: "50%", background: m.color, display: "inline-block" }} />
                          <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>{m.name}</span>
                          {m.id === myId && <Check size={13} color="#3B6E5E" />}
                          <button onClick={() => deleteMember(m.id)} className="focus-ring" aria-label={`${m.name}を削除`} style={{ background: "none", border: "none", cursor: "pointer", color: "#8A8371" }}><Trash2 size={13} /></button>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <input value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addMember()} placeholder="新しいメンバー名" className="focus-ring" style={inputStyle} />
                      <button onClick={addMember} className="focus-ring" style={{ border: "none", background: "#3B6E5E", color: "#fff", borderRadius: 5, padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>追加</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {createOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(20,18,30,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 55 }} onClick={() => setCreateOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#FFFDF7", borderRadius: 8, width: "100%", maxWidth: 360, padding: "20px" }}>
            <div className="mincho" style={{ fontSize: 17, fontWeight: 700, marginBottom: 12 }}>新しいグループを作成</div>
            <input value={createName} onChange={(e) => setCreateName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createGroup()} placeholder="例：〇〇家、△△部" className="focus-ring" style={{ ...inputStyle, marginBottom: 12 }} autoFocus />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setCreateOpen(false)} className="focus-ring" style={{ flex: 1, border: "1px solid #E2D8BE", background: "#fff", color: "#6E6A5F", borderRadius: 6, padding: "9px 0", cursor: "pointer", fontWeight: 700, fontSize: 13.5 }}>キャンセル</button>
              <button onClick={createGroup} className="focus-ring" style={{ flex: 1, border: "none", background: "#B33A3A", color: "#fff", borderRadius: 6, padding: "9px 0", cursor: "pointer", fontWeight: 700, fontSize: 13.5 }}>作成する</button>
            </div>
          </div>
        </div>
      )}

      {joinOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(20,18,30,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 55 }} onClick={() => setJoinOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#FFFDF7", borderRadius: 8, width: "100%", maxWidth: 360, padding: "20px" }}>
            <div className="mincho" style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>招待コードで参加</div>
            <div style={{ fontSize: 11.5, color: "#8A8371", marginBottom: 10 }}>このプレビューでは、今の操作中に作成したグループのコードのみ入力できます</div>
            <input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && joinGroup()} placeholder="例：A3F9K2" className="focus-ring" style={{ ...inputStyle, marginBottom: 8, textTransform: "uppercase", fontFamily: "monospace", letterSpacing: "0.08em" }} autoFocus />
            {joinError && <div style={{ color: "#B33A3A", fontSize: 12, marginBottom: 8 }}>{joinError}</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button onClick={() => setJoinOpen(false)} className="focus-ring" style={{ flex: 1, border: "1px solid #E2D8BE", background: "#fff", color: "#6E6A5F", borderRadius: 6, padding: "9px 0", cursor: "pointer", fontWeight: 700, fontSize: 13.5 }}>キャンセル</button>
              <button onClick={joinGroup} className="focus-ring" style={{ flex: 1, border: "none", background: "#B33A3A", color: "#fff", borderRadius: 6, padding: "9px 0", cursor: "pointer", fontWeight: 700, fontSize: 13.5 }}>参加する</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ScheduleTab({
  groupDoc, currentMonth, goMonth, monthLabel, cells, selected, selectDay, today,
  eventsOn, isVisible, toggleFilter, memberOf, selectedLabel, selectedEvents, openAddModal, openEditModal, deleteEvent, setActiveTab,
}) {
  if (!groupDoc) {
    return (
      <div style={{ background: "#F6F1E4", borderRadius: "0 6px 6px 6px", padding: "32px 20px", textAlign: "center" }}>
        <div style={{ color: "#6E6A5F", fontSize: 13.5, marginBottom: 12 }}>まだグループが選択されていません</div>
        <button onClick={() => setActiveTab("groups")} className="focus-ring" style={{ background: "#B33A3A", color: "#fff", border: "none", borderRadius: 999, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>グループタブへ</button>
      </div>
    );
  }

  return (
    <>
      <div style={{ background: "#F6F1E4", borderRadius: "0 6px 6px 6px", boxShadow: "0 18px 40px rgba(0,0,0,0.35)", position: "relative", paddingLeft: 26, overflow: "hidden" }}>
        <div aria-hidden="true" style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 26, backgroundColor: "#EAE1C9", borderRight: "1px dashed #C9BB98" }} />
        <div aria-hidden="true" style={{ position: "absolute", left: 6, top: 0, bottom: 0, width: 14, backgroundImage: "repeating-linear-gradient(to bottom, #232134 0px, #232134 6px, transparent 6px, transparent 26px)", backgroundSize: "6px 26px", opacity: 0.85, borderRadius: 3 }} />

        <div style={{ padding: "18px 20px 24px" }}>
          <div className="mincho" style={{ fontSize: 13, color: "#8A8371", marginBottom: 10 }}>{groupDoc.name}</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <button onClick={() => goMonth(-1)} className="focus-ring" aria-label="前の月" style={{ padding: 6, borderRadius: 999, border: "1px solid #DDD3BC", background: "#fff8ea", cursor: "pointer" }}><ChevronLeft size={18} color="#2B2A2E" /></button>
            <div className="mincho" style={{ fontSize: 20, fontWeight: 700 }}>{monthLabel}</div>
            <button onClick={() => goMonth(1)} className="focus-ring" aria-label="次の月" style={{ padding: 6, borderRadius: 999, border: "1px solid #DDD3BC", background: "#fff8ea", cursor: "pointer" }}><ChevronRight size={18} color="#2B2A2E" /></button>
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
                <button key={key} onClick={() => selectDay(key, date)} className="day-cell focus-ring" style={{ aspectRatio: "1 / 1", minHeight: 46, borderRadius: 5, border: isSelected ? "1.5px solid #C8963E" : "1px solid #E7DEC7", background: isSelected ? "#FCF3DC" : inMonth ? "#FFFDF7" : "#F1EBDC", opacity: inMonth ? 1 : 0.55, position: "relative", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", padding: "4px 2px 3px" }}>
                  <span className={isToday ? "stamp-ring" : ""} style={{ fontSize: 12.5, fontWeight: isToday ? 800 : 500, width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: isToday ? "#B33A3A" : weekday === 0 ? "#B33A3A" : weekday === 6 ? "#3B5E7A" : "#2B2A2E" }}>{date.getDate()}</span>
                  <div style={{ display: "flex", gap: 2, marginTop: 3, flexWrap: "wrap", justifyContent: "center", maxWidth: "100%" }}>
                    {dayEvents.slice(0, 4).map((e) => (<span key={e.id} style={{ width: 5, height: 5, borderRadius: "50%", background: memberOf(e.memberId).color, display: "inline-block" }} />))}
                    {dayEvents.length > 4 && <span style={{ fontSize: 8, color: "#6E6A5F" }}>+{dayEvents.length - 4}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ background: "#FFFDF7", borderRadius: 6, marginTop: 14, boxShadow: "0 10px 26px rgba(0,0,0,0.28)", padding: "18px 20px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div className="mincho" style={{ fontSize: 17, fontWeight: 700 }}>{selectedLabel}</div>
          <button onClick={openAddModal} className="focus-ring" disabled={groupDoc.members.length === 0} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 700, color: "#fff", background: groupDoc.members.length === 0 ? "#D8B9B9" : "#B33A3A", border: "none", borderRadius: 999, padding: "7px 14px", cursor: groupDoc.members.length === 0 ? "not-allowed" : "pointer" }}><Plus size={15} /> 予定を追加</button>
        </div>

        {groupDoc.members.length === 0 ? (
          <div style={{ color: "#8A8371", fontSize: 13.5, padding: "18px 4px", textAlign: "center", border: "1px dashed #E2D8BE", borderRadius: 6 }}>グループタブからメンバーを追加してください</div>
        ) : selectedEvents.length === 0 ? (
          <div style={{ color: "#8A8371", fontSize: 13.5, padding: "18px 4px", textAlign: "center", border: "1px dashed #E2D8BE", borderRadius: 6 }}>この日の予定はありません</div>
        ) : (
          <ul style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
    </>
  );
}
