export function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function weekdayName(d: Date): string {
  return "周" + "日一二三四五六"[d.getDay()];
}

export function timeText(slot: string): string {
  const end = String(Number(slot.slice(0, 2)) + 1).padStart(2, "0") + ":00";
  return `${slot} - ${end}`;
}
