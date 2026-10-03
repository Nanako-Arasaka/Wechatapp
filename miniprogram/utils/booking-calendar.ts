import { AvailabilityData, VenueSlot } from "../types";
import { formatDate, getWeekdayName } from "./format";

export interface BookingDay {
  date: string;
  day: number;
  weekday: string;
  isToday: boolean;
  isClosed: boolean;
  totalRemaining: number;
  availableSlotCount: number;
  error: boolean;
  empty: boolean;
  disabled: boolean;
}

export function bookingDates(now = new Date(), advanceDays = 7): string[] {
  const limit = Math.min(7, Math.max(1, Math.floor(advanceDays || 7)));
  return Array.from({ length: limit + 1 }, (_, index) =>
    formatDate(
      new Date(now.getFullYear(), now.getMonth(), now.getDate() + index),
    ),
  );
}

export function isBookingDate(date: string, now = new Date()): boolean {
  return bookingDates(now).includes(date);
}

/**
 * 过滤出普通用户可见的时段。
 *
 * 被管理员关闭（isBlocked）的时段对普通用户完全不可见：既不出现在时段
 * 列表、也不计入每日余量汇总、更不能被下单。用户端所有渲染与校验都必须
 * 走这一个入口，避免各处各自判断导致口径不一致而泄漏内部预留。
 */
export function userVisibleSlots(slots: VenueSlot[]): VenueSlot[] {
  return (slots || []).filter((slot) => !slot?.isBlocked);
}

export function summarizeDay(
  date: string,
  availability?: AvailabilityData,
  now = new Date(),
): BookingDay {
  const slots = availability?.isClosed
    ? []
    : userVisibleSlots(availability?.slots || []).filter(
        (slot) => slot.isSelectable && slot.remaining > 0,
      );
  const totalRemaining = slots.reduce(
    (total, slot) => total + slot.remaining,
    0,
  );
  return {
    date,
    day: Number(date.slice(-2)),
    weekday: getWeekdayName(date),
    isToday: date === formatDate(now),
    isClosed: !!availability?.isClosed,
    totalRemaining,
    availableSlotCount: slots.length,
    error: !availability,
    empty: false,
    disabled: !availability || !!availability.isClosed || totalRemaining === 0,
  };
}

export function calendarCells(
  days: BookingDay[],
  now = new Date(),
): BookingDay[] {
  const mondayOffset = (now.getDay() + 6) % 7;
  return Array.from({ length: 14 }, (_, index) => {
    const date = formatDate(
      new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - mondayOffset + index,
      ),
    );
    return (
      days.find((day) => day.date === date) || {
        ...summarizeDay(date, undefined, now),
        empty: true,
      }
    );
  });
}
