import { API_BASE } from "../config";
import { fmtDate, weekdayName } from "../utils/date";
import type { AvailabilityResponse, DaySummary } from "../types";

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(API_BASE + path, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const body = await res.json();
  if (body && typeof body === "object" && "code" in body) {
    if (body.code !== 0) throw new Error(body.message || "code " + body.code);
    return body.data;
  }
  return body;
}

export async function fetchDaySummaries(
  venueId: number,
): Promise<DaySummary[]> {
  const days: DaySummary[] = [];
  const now = new Date();
  for (let i = 0; i <= 7; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const date = fmtDate(d);
    let totalRemaining = 0;
    let availableSlotCount = 0;
    let isClosed = false;
    let closedReason = "";
    try {
      const av = await apiGet<AvailabilityResponse>(
        `/venues/${venueId}/availability?date=${date}`,
      );
      isClosed = !!av.isClosed;
      closedReason = av.closedReason || "";
      (av.slots || []).forEach((s) => {
        if (s.isSelectable) {
          totalRemaining += s.remaining || 0;
          availableSlotCount += 1;
        }
      });
    } catch (e) {
      console.warn("availability fail", date, e);
      // mock 降级
      totalRemaining = isClosed ? 0 : Math.max(0, 20 - i * 2);
      availableSlotCount = isClosed ? 0 : 6;
    }
    days.push({
      date,
      weekday: weekdayName(d),
      isToday: i === 0,
      isClosed,
      closedReason,
      totalRemaining,
      availableSlotCount,
    });
  }
  return days;
}
