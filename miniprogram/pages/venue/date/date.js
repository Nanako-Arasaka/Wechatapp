"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const booking_calendar_1 = require("../../../utils/booking-calendar");
const format_1 = require("../../../utils/format");
const venue_service_1 = require("../../../services/venue.service");
/**
 * 选择预约日期页（DatePickerPage）
 * ----------------------------------------------------------------------------
 * 日历天数必须跟随场馆配置的可提前预约天数（Venue.advanceDays），
 * 不能写死 7 天：管理员把窗口调成 3 天时，日历上就不该出现第 4 天，
 * 否则用户点得到、却会在选时段页被拦下，体验割裂。
 */
Page({
    data: {
        venueId: "",
        currentDate: "",
        days: [],
        advanceDays: 7,
        loading: true,
        loadError: false,
    },
    _loadId: 0,
    _unloaded: false,
    onLoad(options) {
        const venueId = options.id || "";
        if (!venueId) {
            this.setData({ loading: false, loadError: true });
            return;
        }
        this.setData({ venueId });
        // 先按默认窗口渲染，避免空白闪烁；拿到 venue 后再按真实窗口纠正
        this.renderDays((0, format_1.formatDate)(new Date()), 7);
        this.loadCalendar(venueId);
    },
    onUnload() {
        this._unloaded = true;
        this._loadId++;
    },
    onPullDownRefresh() {
        if (!this.data.venueId) {
            wx.stopPullDownRefresh();
            return;
        }
        this.loadCalendar(this.data.venueId).finally(() => {
            wx.stopPullDownRefresh();
        });
    },
    async loadCalendar(venueId) {
        const loadId = ++this._loadId;
        this.setData({ loading: true, loadError: false });
        try {
            // 场馆配置决定日历窗口，必须先拿到
            const venue = await venue_service_1.VenueService.getVenueDetail(venueId);
            if (loadId !== this._loadId || this._unloaded)
                return;
            const advanceDays = Number(venue?.advanceDays) || 7;
            const dates = (0, booking_calendar_1.bookingDates)(new Date(), advanceDays);
            this.setData({ advanceDays });
            this.renderDays((0, format_1.formatDate)(new Date()), advanceDays);
            // 逐日拉余量。串行以免弱网下并发打满；单日失败不影响其他日期。
            const summaries = {};
            for (const date of dates) {
                try {
                    const avail = await venue_service_1.VenueService.getAvailability(venueId, date);
                    if (loadId !== this._loadId || this._unloaded)
                        return;
                    summaries[date] = (0, booking_calendar_1.summarizeDay)(date, avail);
                }
                catch (err) {
                    if (loadId !== this._loadId || this._unloaded)
                        return;
                    summaries[date] = (0, booking_calendar_1.summarizeDay)(date, undefined);
                }
            }
            if (loadId !== this._loadId || this._unloaded)
                return;
            this.setData({ loading: false });
            this.applySummaries(summaries, advanceDays);
        }
        catch (err) {
            if (loadId !== this._loadId || this._unloaded)
                return;
            console.error("加载预约日历失败:", err);
            // 场馆详情拿不到时仍按默认窗口展示日期，不让用户卡死在空白页
            this.setData({ loading: false, loadError: true });
            this.renderDays((0, format_1.formatDate)(new Date()), 7);
        }
    },
    renderDays(today, advanceDays) {
        const days = (0, booking_calendar_1.bookingDates)(new Date(), advanceDays).map((date) => ({
            date,
            weekday: (0, format_1.getWeekdayName)(date),
            isToday: date === today,
            remainingText: "",
            disabled: false,
            closedText: "",
        }));
        this.setData({ days });
    },
    /** 把每日余量汇总写回日历：约满/闭馆直接置灰，不给用户点了才发现的体验 */
    applySummaries(summaries, advanceDays) {
        const today = (0, format_1.formatDate)(new Date());
        const days = (0, booking_calendar_1.bookingDates)(new Date(), advanceDays).map((date) => {
            const summary = summaries[date];
            const isClosed = !!summary?.isClosed;
            const hasStock = !!summary && !summary.error && summary.totalRemaining > 0;
            return {
                date,
                weekday: (0, format_1.getWeekdayName)(date),
                isToday: date === today,
                remainingText: summary && !summary.error
                    ? isClosed
                        ? "闭馆"
                        : hasStock
                            ? `余 ${summary.totalRemaining}`
                            : "约满"
                    : "",
                disabled: !hasStock,
                closedText: isClosed ? "该日闭馆" : "",
            };
        });
        this.setData({ days });
    },
    onRetry() {
        if (this.data.venueId)
            this.loadCalendar(this.data.venueId);
    },
    onSelectDate(e) {
        const date = e.currentTarget.dataset.date;
        if (!date || !this.data.venueId)
            return;
        if (e.currentTarget.dataset.disabled) {
            wx.showToast({ title: "该日暂无可约时段", icon: "none" });
            return;
        }
        wx.redirectTo({
            url: `/pages/venue/booking/booking?id=${encodeURIComponent(this.data.venueId)}&date=${encodeURIComponent(date)}`,
        });
    },
});
