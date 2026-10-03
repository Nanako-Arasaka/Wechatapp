"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const booking_calendar_1 = require("../../../utils/booking-calendar");
const format_1 = require("../../../utils/format");
Page({
    data: {
        venueId: "",
        currentDate: "",
        days: [],
    },
    onLoad(options) {
        const venueId = options.id || "";
        const currentDate = options.date || (0, format_1.formatDate)(new Date());
        const today = (0, format_1.formatDate)(new Date());
        const days = (0, booking_calendar_1.bookingDates)(new Date(), 7).map((date) => ({
            date,
            weekday: (0, format_1.getWeekdayName)(date),
            isToday: date === today,
        }));
        this.setData({ venueId, currentDate, days });
    },
    onSelectDate(e) {
        const date = e.currentTarget.dataset.date;
        if (!date || !this.data.venueId)
            return;
        wx.redirectTo({
            url: `/pages/venue/booking/booking?id=${encodeURIComponent(this.data.venueId)}&date=${encodeURIComponent(date)}`,
        });
    },
});
