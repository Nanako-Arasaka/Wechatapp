"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookingDates = bookingDates;
exports.isBookingDate = isBookingDate;
exports.summarizeDay = summarizeDay;
exports.calendarCells = calendarCells;
const format_1 = require("./format");
function bookingDates(now = new Date(), advanceDays = 7) {
    const limit = Math.min(7, Math.max(1, Math.floor(advanceDays || 7)));
    return Array.from({ length: limit + 1 }, (_, index) => (0, format_1.formatDate)(new Date(now.getFullYear(), now.getMonth(), now.getDate() + index)));
}
function isBookingDate(date, now = new Date()) {
    return bookingDates(now).includes(date);
}
function summarizeDay(date, availability, now = new Date()) {
    const slots = availability?.isClosed
        ? []
        : (availability?.slots || []).filter((slot) => slot.isSelectable && slot.remaining > 0);
    const totalRemaining = slots.reduce((total, slot) => total + slot.remaining, 0);
    return {
        date,
        day: Number(date.slice(-2)),
        weekday: (0, format_1.getWeekdayName)(date),
        isToday: date === (0, format_1.formatDate)(now),
        isClosed: !!availability?.isClosed,
        totalRemaining,
        availableSlotCount: slots.length,
        error: !availability,
        empty: false,
        disabled: !availability || !!availability.isClosed || totalRemaining === 0,
    };
}
function calendarCells(days, now = new Date()) {
    const mondayOffset = (now.getDay() + 6) % 7;
    return Array.from({ length: 14 }, (_, index) => {
        const date = (0, format_1.formatDate)(new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset + index));
        return (days.find((day) => day.date === date) || {
            ...summarizeDay(date, undefined, now),
            empty: true,
        });
    });
}
