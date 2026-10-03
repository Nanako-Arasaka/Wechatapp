"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calendarCells = exports.summarizeDay = exports.userVisibleSlots = exports.isBookingDate = exports.bookingDates = void 0;
const format_1 = require("./format");
function bookingDates(now = new Date(), advanceDays = 7) {
    const limit = Math.min(7, Math.max(1, Math.floor(advanceDays || 7)));
    return Array.from({ length: limit + 1 }, (_, index) => (0, format_1.formatDate)(new Date(now.getFullYear(), now.getMonth(), now.getDate() + index)));
}
exports.bookingDates = bookingDates;
function isBookingDate(date, now = new Date()) {
    return bookingDates(now).includes(date);
}
exports.isBookingDate = isBookingDate;
/**
 * 过滤出普通用户可见的时段。
 *
 * 被管理员关闭（isBlocked）的时段对普通用户完全不可见：既不出现在时段
 * 列表、也不计入每日余量汇总、更不能被下单。用户端所有渲染与校验都必须
 * 走这一个入口，避免各处各自判断导致口径不一致而泄漏内部预留。
 */
function userVisibleSlots(slots) {
    return (slots || []).filter((slot) => !slot?.isBlocked);
}
exports.userVisibleSlots = userVisibleSlots;
function summarizeDay(date, availability, now = new Date()) {
    const slots = availability?.isClosed
        ? []
        : userVisibleSlots(availability?.slots || []).filter((slot) => slot.isSelectable && slot.remaining > 0);
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
exports.summarizeDay = summarizeDay;
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
exports.calendarCells = calendarCells;
