import React, { useState, useEffect, useMemo } from "react";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { Users, CalendarDays, Loader2 } from "lucide-react";
import GroupsTab from "./GroupsTab.jsx";
import ScheduleTab from "./ScheduleTab.jsx";
import OnboardModal from "./OnboardModal.jsx";
import EventModal from "./EventModal.jsx";
import { dateKey, parseDateKey, makeId, makeGroupCode, nextColor, occursOn, WEEKDAYS } from "./dateUtils";

const PROFILE_KEY = "family-schedule-profile";

function loadLocalProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    /* ignore */
  }
  return { myGroups: [], activeGroupId: null, myMemberIds: {} };
}
function persistProfile(next) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
  } catch (e) {
    /* ignore */
  }
}

function emptyForm(todayKey) {
  return { title: "", startDate: todayKey, endDate: todayKey, startTime: "", endTime: "", recurrence: "none", recurrenceEndDate: "", memo: "", memberId: null };
}

export default function App() {
  const today = new Date();
  const todayKey = dateKey(today);

  const [profile, setProfile] = useState(loadLocalProfile);
  const [activeTab, setActiveTab] = useState(() => (loadLocalProfile().activeGroupId ? "schedule" : "groups"));
  const [groupDoc, setGroupDoc] = useState(null);
  const [groupLoading, setGroupLoading] = useState(!!profile.activeGroupId);
  const [groupLoadError, setGroupLoadError] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
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

  function updateProfile(next) {
    setProfile(next);
    persistProfile(next);
  }

  // ---- subscribe to the active group's Firestore doc in real time ----
  useEffect(() => {
    if (!profile.activeGroupId) {
      setGroupDoc(null);
      setGroupLoading(false);
      return;
    }
    setGroupLoading(true);
    setGroupLoadError(false);
    setFilterIds(null);
    const ref = doc(db, "groups", profile.activeGroupId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setGroupDoc(null);
          setGroupLoadError(true);
          setGroupLoading(false);
          return;
        }
        setGroupDoc(snap.data());
        setGroupLoading(false);
      },
      (err) => {
        console.error(err);
        setGroupLoadError(true);
        setGroupLoading(false);
      }
    );
    return () => unsub();
  }, [profile.activeGroupId]);

  // ---- re-check "who am I" whenever the group data or profile changes ----
  useEffect(() => {
    if (!groupDoc || !profile.activeGroupId) return;
    const myId = profile.myMemberIds ? profile.myMemberIds[profile.activeGroupId] : null;
    const stillExists = myId && groupDoc.members.some((m) => m.id === myId);
    setOnboardOpen(!stillExists);
  }, [groupDoc, profile.activeGroupId, profile.myMemberIds]);

  async function writeGroup(nextDoc) {
    try {
      await setDoc(doc(db, "groups", nextDoc.code), nextDoc);
      setSaveError(false);
      return true;
    } catch (e) {
      console.error(e);
      setSaveError(true);
      return false;
    }
  }

  // ---- create / join / switch / leave groups ----
  async function createGroup() {
    const name = createName.trim();
    if (!name || creating) return;
    setCreating(true);
    setCreateError("");
    try {
      // collision chance is astronomically low (33^6 combinations), so a
      // single random code is used directly rather than a fragile pre-check
      const code = makeGroupCode();
      const newDoc = { name, code, members: [], events: [] };
      const ok = await writeGroup(newDoc);
      if (!ok) throw new Error("write failed");
      const nextProfile = { ...profile, myGroups: [...profile.myGroups, { id: code, name }], activeGroupId: code };
      updateProfile(nextProfile);
      setCreateOpen(false);
      setCreateName("");
      setActiveTab("schedule");
    } catch (e) {
      setCreateError("作成に失敗しました。Firebaseの設定(src/firebase.js)とFirestoreのセキュリティルールをご確認ください。");
    } finally {
      setCreating(false);
    }
  }

  async function joinGroup() {
    const code = joinCode.trim().toUpperCase();
    if (!code || joining) return;
    setJoining(true);
    setJoinError("");
    try {
      const snap = await getDoc(doc(db, "groups", code));
      if (!snap.exists()) {
        setJoinError("グループが見つかりませんでした。コードをご確認ください");
        return;
      }
      const data = snap.data();
      const already = profile.myGroups.some((g) => g.id === code);
      const nextProfile = {
        ...profile,
        myGroups: already ? profile.myGroups : [...profile.myGroups, { id: code, name: data.name }],
        activeGroupId: code,
      };
      updateProfile(nextProfile);
      setJoinOpen(false);
      setJoinCode("");
      setJoinError("");
      setActiveTab("schedule");
    } catch (e) {
      setJoinError("通信エラーが発生しました。Firebaseの設定をご確認のうえ、もう一度お試しください");
    } finally {
      setJoining(false);
    }
  }

  function selectGroup(id) {
    if (id === profile.activeGroupId) {
      setActiveTab("schedule");
      return;
    }
    updateProfile({ ...profile, activeGroupId: id });
    setActiveTab("schedule");
  }

  function leaveGroup(id, name) {
    if (!window.confirm(`「${name}」から退出しますか？(グループ自体は削除されません)`)) return;
    const nextMemberIds = { ...profile.myMemberIds };
    delete nextMemberIds[id];
    updateProfile({
      ...profile,
      myGroups: profile.myGroups.filter((g) => g.id !== id),
      activeGroupId: profile.activeGroupId === id ? null : profile.activeGroupId,
      myMemberIds: nextMemberIds,
    });
  }

  function copyCode(code) {
    try {
      navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 1500);
    } catch (e) {
      /* clipboard unavailable */
    }
  }

  // ---- onboarding: who am I within the active group ----
  function chooseExisting(memberId) {
    const id = groupDoc.code;
    const nextMemberIds = { ...profile.myMemberIds, [id]: memberId };
    updateProfile({ ...profile, myMemberIds: nextMemberIds });
    setOnboardOpen(false);
    setOnboardName("");
  }
  async function addSelfAsNew() {
    const name = onboardName.trim();
    if (!name || !groupDoc) return;
    const newMember = { id: makeId(), name, color: nextColor(groupDoc.members) };
    await writeGroup({ ...groupDoc, members: [...groupDoc.members, newMember] });
    const nextMemberIds = { ...profile.myMemberIds, [groupDoc.code]: newMember.id };
    updateProfile({ ...profile, myMemberIds: nextMemberIds });
    setOnboardOpen(false);
    setOnboardName("");
  }

  // ---- manage members of the active group ----
  async function addMember() {
    const name = newMemberName.trim();
    if (!name || !groupDoc) return;
    const newMember = { id: makeId(), name, color: nextColor(groupDoc.members) };
    await writeGroup({ ...groupDoc, members: [...groupDoc.members, newMember] });
    setNewMemberName("");
  }
  async function deleteMember(id) {
    if (!groupDoc) return;
    const m = groupDoc.members.find((x) => x.id === id);
    if (!window.confirm(`「${m ? m.name : ""}」をメンバーから削除しますか？\n(この方の予定は残りますが「不明」として表示されます)`)) return;
    await writeGroup({ ...groupDoc, members: groupDoc.members.filter((x) => x.id !== id) });
    const myId = profile.myMemberIds ? profile.myMemberIds[groupDoc.code] : null;
    if (myId === id) {
      const nextMemberIds = { ...profile.myMemberIds };
      delete nextMemberIds[groupDoc.code];
      updateProfile({ ...profile, myMemberIds: nextMemberIds });
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

  async function saveForm() {
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
    await writeGroup({ ...groupDoc, events: nextEvents });
    setModalOpen(false);
  }
  async function deleteEvent(id) {
    await writeGroup({ ...groupDoc, events: groupDoc.events.filter((e) => e.id !== id) });
  }

  return (
    <div style={{ minHeight: "100dvh", background: "#232134", backgroundImage: "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.03), transparent 40%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.025), transparent 45%)", fontFamily: "'Noto Sans JP', sans-serif", color: "#2B2A2E", padding: "24px 12px 60px", overflowX: "hidden" }}>
      <style>{`
        html, body { margin: 0; overflow-x: hidden; -webkit-text-size-adjust: 100%; }
        *, *::before, *::after { box-sizing: border-box; }
        .mincho { font-family: 'Shippori Mincho', serif; }
        .stamp-ring { box-shadow: 0 0 0 1.5px #B33A3A, 0 0 0 4px rgba(179,58,58,0.15); }
        @media (prefers-reduced-motion: no-preference) { .day-cell { transition: transform .12s ease; } .day-cell:hover { transform: translateY(-1px); } }
        .focus-ring:focus-visible { outline: 2px solid #C8963E; outline-offset: 2px; }
        .chip-scroll::-webkit-scrollbar { height: 5px; }
        .chip-scroll::-webkit-scrollbar-thumb { background: #DCD2B8; border-radius: 4px; }
        input, select, textarea { font-size: 16px !important; }
      `}</style>

      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 6, padding: "0 6px" }}>
          <h1 className="mincho" style={{ color: "#F6F1E4", fontSize: 26, fontWeight: 800, letterSpacing: "0.04em" }}>予定手帳</h1>
          <span style={{ color: "#C8963E", fontSize: 12, letterSpacing: "0.15em" }}>SCHEDULE&nbsp;DIARY</span>
        </div>

        <div style={{ display: "flex", gap: 6, padding: "0 6px", marginBottom: 12 }}>
          {[{ key: "groups", label: "グループ", icon: Users }, { key: "schedule", label: "予定表", icon: CalendarDays }].map((t) => {
            const Icon = t.icon;
            const on = activeTab === t.key;
            return (
              <button key={t.key} onClick={() => setActiveTab(t.key)} className="focus-ring" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 0", borderRadius: "6px 6px 0 0", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 700, background: on ? "#F6F1E4" : "rgba(246,241,228,0.14)", color: on ? "#B33A3A" : "rgba(246,241,228,0.7)" }}>
                <Icon size={15} /> {t.label}
              </button>
            );
          })}
        </div>

        {activeTab === "groups" ? (
          <GroupsTab
            profile={profile} groupDoc={groupDoc} myId={myId}
            createOpen={createOpen} setCreateOpen={setCreateOpen} createName={createName} setCreateName={setCreateName} createGroup={createGroup} creating={creating} createError={createError}
            joinOpen={joinOpen} setJoinOpen={setJoinOpen} joinCode={joinCode} setJoinCode={setJoinCode} joinError={joinError} joinGroup={joinGroup} joining={joining}
            selectGroup={selectGroup} leaveGroup={leaveGroup} copyCode={copyCode} copiedCode={copiedCode}
            newMemberName={newMemberName} setNewMemberName={setNewMemberName} addMember={addMember} deleteMember={deleteMember}
          />
        ) : (
          <ScheduleTab
            groupDoc={groupDoc} groupLoading={groupLoading} groupLoadError={groupLoadError}
            currentMonth={currentMonth} goMonth={goMonth} monthLabel={monthLabel}
            cells={cells} selected={selected} selectDay={selectDay} today={today}
            eventsOn={eventsOn} isVisible={isVisible} toggleFilter={toggleFilter} memberOf={memberOf}
            selectedLabel={selectedLabel} selectedEvents={selectedEvents}
            openAddModal={openAddModal} openEditModal={openEditModal} deleteEvent={deleteEvent}
            setActiveTab={setActiveTab}
          />
        )}

        {saveError && <div style={{ color: "#F0B4B4", fontSize: 12, textAlign: "center", marginTop: 10 }}>保存に失敗しました。通信環境をご確認のうえ、もう一度お試しください。</div>}
      </div>

      {onboardOpen && groupDoc && (
        <OnboardModal groupDoc={groupDoc} onboardName={onboardName} setOnboardName={setOnboardName} chooseExisting={chooseExisting} addSelfAsNew={addSelfAsNew} />
      )}

      {modalOpen && groupDoc && (
        <EventModal groupDoc={groupDoc} editingId={editingId} form={form} setForm={setForm} formError={formError} closeModal={closeModal} saveForm={saveForm} deleteEvent={deleteEvent} setModalOpen={setModalOpen} />
      )}
    </div>
  );
}
