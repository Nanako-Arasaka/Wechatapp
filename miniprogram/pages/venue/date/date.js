"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const venue_service_1 = require("../../../services/venue.service");
const booking_calendar_1 = require("../../../utils/booking-calendar");
Page({
    data: {
        id: "",
        venue: null,
        monthLabel: "",
        advanceDays: 7,
        weekdays: ["一", "二", "三", "四", "五", "六", "日"],
        days: [],
        cells: [],
        selectedDate: "",
        loading: true,
        refreshing: false,
        loadError: false,
        hasDayErrors: false,
        navigating: false,
    },
    _loadId: 0,
    _unloaded: false,
    onLoad(options) {
        this.setData({ id: options.id || "" });
        this.loadDays();
    },
    onUnload() {
        this._unloaded = true;
        this._loadId++;
    },
    async loadDays() {
        const loadId = ++this._loadId;
        const now = new Date();
        this.setData({
            loading: !this.data.days.length,
            refreshing: true,
            loadError: false,
        });
        try {
            if (!this.data.id)
                throw new Error("缺少场馆");
            const venue = this.data.venue || (await venue_service_1.VenueService.getVenueDetail(this.data.id));
            const dates = (0, booking_calendar_1.bookingDates)(now, venue.advanceDays);
            const days = [];
            // 每批最多四个请求，给其他小程序请求留出连接。
            for (let offset = 0; offset < dates.length; offset += 4) {
                if (loadId !== this._loadId || this._unloaded)
                    return;
                const batch = await Promise.all(dates.slice(offset, offset + 4).map(async (date) => {
                    try {
                        return (0, booking_calendar_1.summarizeDay)(date, await venue_service_1.VenueService.getAvailability(this.data.id, date), now);
                    }
                    catch {
                        return (0, booking_calendar_1.summarizeDay)(date, undefined, now);
                    }
                }));
                days.push(...batch);
            }
            if (loadId !== this._loadId || this._unloaded)
                return;
            const selected = days.find((day) => day.date === this.data.selectedDate && !day.disabled);
            this.setData({
                venue,
                advanceDays: dates.length - 1,
                days,
                cells: (0, booking_calendar_1.calendarCells)(days, now),
                selectedDate: selected?.date || "",
                monthLabel: `${now.getFullYear()}年${now.getMonth() + 1}月`,
                loading: false,
                refreshing: false,
                loadError: days.every((day) => day.error),
                hasDayErrors: days.some((day) => day.error),
            });
        }
        catch {
            if (loadId === this._loadId && !this._unloaded) {
                this.setData({
                    loading: false,
                    refreshing: false,
                    loadError: true,
                    selectedDate: "",
                });
            }
        }
    },
    onRetry() {
        return this.loadDays();
    },
    onPullDownRefresh() {
        this.loadDays().finally(() => wx.stopPullDownRefresh());
    },
    onSelectDate(e) {
        if (this.data.refreshing || this.data.loadError)
            return;
        const day = this.data.days.find((item) => item.date === e.currentTarget.dataset.date);
        if (!day || day.disabled) {
            wx.showToast({
                title: day?.error ? "该日余量加载失败，请刷新" : "该日闭馆或已约满",
                icon: "none",
            });
            return;
        }
        this.setData({ selectedDate: day.date });
    },
    goToTime() {
        if (this.data.navigating || this.data.refreshing || this.data.loadError)
            return;
        const day = this.data.days.find((item) => item.date === this.data.selectedDate && !item.disabled);
        if (!day)
            return;
        if (!(0, booking_calendar_1.isBookingDate)(day.date)) {
            this.setData({ selectedDate: "" });
            this.loadDays();
            wx.showToast({ title: "日期已更新，请重新选择", icon: "none" });
            return;
        }
        this.setData({ navigating: true });
        wx.navigateTo({
            url: `/pages/venue/booking/booking?id=${encodeURIComponent(this.data.id)}&date=${day.date}`,
            complete: () => {
                if (!this._unloaded)
                    this.setData({ navigating: false });
            },
        });
    },
});
