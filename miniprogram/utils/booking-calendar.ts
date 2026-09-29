import { AvailabilityData } from "../types";
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

export function summarizeDay(
  date: string,
  availability?: AvailabilityData,
  now = new Date(),
): BookingDay {
  const slots = availability?.isClosed
    ? []
    : (availability?.slots || []).filter(
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
