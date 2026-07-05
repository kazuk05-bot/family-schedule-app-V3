export const MEMBER_COLORS = ["#B33A3A", "#3B6E5E", "#3B5E7A", "#C8963E", "#7C5AA6", "#A6763A", "#5C7A3B", "#A63B6B"];
export const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid confusion
export const RECUR_LABEL = { weekly: "毎週", monthly: "毎月" };

export function pad(n) { return String(n).padStart(2, "0"); }
export function dateKey(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
export function parseDateKey(s) { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); }
export function sameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
export function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
export function daysBetween(a, b) { return Math.round((b - a) / 86400000); }
export function addMonthsClamped(d, n) {
  const idx = d.getMonth() + n;
  const year = d.getFullYear() + Math.floor(idx / 12);
  const month = ((idx % 12) + 12) % 12;
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(d.getDate(), lastDay));
}
export function makeId() { return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }
export function makeGroupCode() {
  let s = "";
  for (let i = 0; i < 6; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return s;
}
export function nextColor(members) { return MEMBER_COLORS[members.length % MEMBER_COLORS.length]; }

// Does an event (possibly recurring, possibly multi-day) occur on `date`?
export function occursOn(ev, date) {
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

export function fmtMD(dateStr) {
  const d = parseDateKey(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
