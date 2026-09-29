"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const venue_service_1 = require("../../../services/venue.service");
const format_1 = require("../../../utils/format");
const booking_calendar_1 = require("../../../utils/booking-calendar");
const venue_image_1 = require("../../../utils/venue-image");
/**
 * ============================================================================
 * P2 选择时间页 (BookingPage)
 * ----------------------------------------------------------------------------
 * 用户目标：选择指定日期的预约时段。
 * 核心交互逻辑：
 * 1. 接收日历选中的日期；首页快速预约默认使用当天。
 * 2. 小时格子时间选择组件：
 *    灰色色块 = 不可预约时段（已过时段/闭馆/已满），可选时段支持点击选中。
 * 3. 选中时段后展示摘要信息（场馆、日期、时间段、单价）。
 * 4. 点击【下一步】携带参数路由跳转至 P3 可选场地页（venue/court）。
 * ============================================================================
 */
Page({
    data: {
        id: "", // 场馆 ID
        venue: {}, // 场馆信息
        coverImage: "",
        today: "", // 当前预约日期 YYYY-MM-DD，沿用已有传参字段
        todayText: "",
        slots: [],
        selectedSlotId: "", // 当前选中的时段 ID
        selectedSlot: null, // 当前选中的时段对象
        selectedPriceText: "", // 选中时段单价展示文本
        summaryEnter: false, // 已选时段摘要：仅首次出现播放入场
        isClosed: false, // 场馆今日是否闭馆
        closedReason: "", // 闭馆原因
        loading: true,
        loadError: false, // 加载失败标记（展示错误占位与重试）
        navigating: false, // 下一步跳转防连点
    },
    _loadId: 0,
    _unloaded: false,
    _summaryTimer: null,
    onLoad(options) {
        if (options && options.id) {
            this.setData({ id: options.id });
            const today = options.date || (0, format_1.formatDate)(new Date(), "YYYY-MM-DD");
            this.setData({ today });
            if (!(0, booking_calendar_1.isBookingDate)(today)) {
                this.setData({ loading: false, loadError: true });
                wx.showToast({ title: "请选择今天或未来 7 天的日期", icon: "none" });
                return;
            }
            this.setData({
                today,
                todayText: `${today} ${(0, format_1.getWeekdayName)(today)}`,
            });
            this.loadVenueAndTodaySlots(options.id, options.slotId);
        }
        else {
            this.setData({ loading: false, loadError: true });
        }
    },
    onUnload() {
        this._unloaded = true;
        this._loadId++;
        if (this._summaryTimer)
            clearTimeout(this._summaryTimer);
    },
    changeDate() {
        const previous = getCurrentPages().slice(-2)[0];
        if (previous?.route === "pages/venue/date/date")
            wx.navigateBack();
        else
            wx.redirectTo({
                url: `/pages/venue/date/date?id=${encodeURIComponent(this.data.id)}`,
            });
    },
    onImageError() {
        this.setData({ coverImage: "/assets/ui/venue.svg" });
    },
    /**
     * 加载场馆详情 + 所选日期时段余量
     * @param venueId 场馆 ID
     * @param preselectSlotId 外部携带的预选时段 ID（可选，首页快速预约直达场景）
     */
    async loadVenueAndTodaySlots(venueId, preselectSlotId) {
        const loadId = ++this._loadId;
        try {
            const today = this.data.today || (0, format_1.formatDate)(new Date(), "YYYY-MM-DD");
            if (!(0, booking_calendar_1.isBookingDate)(today))
                throw new Error("预约日期已过期");
            this.setData({
                loading: true,
                loadError: false,
                selectedSlotId: "",
                selectedSlot: null,
                selectedPriceText: "",
            });
            // 并行请求场馆详情与所选日期的余量。
            const [venue, avail] = await Promise.all([
                venue_service_1.VenueService.getVenueDetail(venueId),
                venue_service_1.VenueService.getAvailability(venueId, today),
            ]);
            if (loadId !== this._loadId || this._unloaded)
                return;
            if (!(0, booking_calendar_1.bookingDates)(new Date(), venue.advanceDays).includes(today)) {
                throw new Error("超出该场馆可提前预约的日期范围");
            }
            // 可选状态以服务端为准，未来日期不能按今天的钟点置灰。
            const slots = avail.slots || [];
            this.setData({
                venue,
                coverImage: (0, venue_image_1.venueImage)(venue.coverImage),
                today,
                todayText: `${today} ${(0, format_1.getWeekdayName)(today)}`,
                slots,
                isClosed: avail.isClosed,
                closedReason: avail.closedReason || "",
                selectedSlotId: "",
                selectedSlot: null,
                selectedPriceText: "",
            });
            // 支持外部携带 preselectSlotId 直达选中（该时段须仍可选）
            if (preselectSlotId && !avail.isClosed) {
                const found = slots.find((s) => s.id === preselectSlotId && s.isSelectable);
                if (found) {
                    this.applySelectedSlot(found);
                }
            }
        }
        catch (err) {
            if (loadId !== this._loadId || this._unloaded)
                return;
            console.error("加载场馆与预约时段失败:", err);
            this.setData({
                loadError: true,
                slots: [],
                selectedSlotId: "",
                selectedSlot: null,
                selectedPriceText: "",
            });
        }
        finally {
            if (loadId === this._loadId && !this._unloaded)
                this.setData({ loading: false });
        }
    },
    onPullDownRefresh() {
        if (!this.data.id) {
            wx.stopPullDownRefresh();
            return;
        }
        this.loadVenueAndTodaySlots(this.data.id, this.data.selectedSlotId || undefined).finally(() => {
            wx.stopPullDownRefresh();
        });
    },
    onRetry() {
        if (this.data.id) {
            this.loadVenueAndTodaySlots(this.data.id);
        }
    },
    /**
     * 用户点击选中某个小时时段格子
     * 不可预约（灰色）时段点击无效，仅可选时段可选中
     */
    onSelectSlot(e) {
        const slot = e.currentTarget.dataset.slot;
        if (this.data.loading || this.data.loadError || !slot)
            return;
        if (!slot.isSelectable) {
            // 灰色不可预约时段：轻提示拦截
            wx.showToast({
                title: `该时段不可预约（${slot.statusText}）`,
                icon: "none",
            });
            return;
        }
        this.applySelectedSlot(slot);
    },
    /**
     * 应用选中时段并刷新摘要信息
     * 动效策略：时段格子用 CSS selection-pop；摘要卡仅首次出现入场，
     * 换时间只让时间段数值微动，避免整卡跳跃。
     */
    applySelectedSlot(slot) {
        if (this._summaryTimer)
            clearTimeout(this._summaryTimer);
        const hadSlot = !!this.data.selectedSlot;
        this.setData({
            selectedSlotId: slot.id,
            selectedSlot: slot,
            selectedPriceText: (0, format_1.formatMoney)(slot.price),
            summaryEnter: !hadSlot,
        });
        if (!hadSlot) {
            this._summaryTimer = setTimeout(() => {
                this.setData({ summaryEnter: false });
            }, 240);
        }
    },
    /**
     * 点击【下一步】：携带预约基础信息跳转 P3 可选场地页
     */
    goToCourtSelect() {
        if (this.data.navigating || this.data.loading || this.data.loadError)
            return;
        if (!this.data.selectedSlot) {
            wx.showToast({ title: "请先选择预约时段", icon: "none" });
            return;
        }
        this.setData({ navigating: true });
        const { id, venue, today, selectedSlot } = this.data;
        const params = [
            `venueId=${encodeURIComponent(id)}`,
            `venueName=${encodeURIComponent(venue.name || "")}`,
            `venueAddress=${encodeURIComponent(venue.address || "")}`,
            `slotId=${encodeURIComponent(selectedSlot.id)}`,
            `date=${encodeURIComponent(today)}`,
            `timeRange=${encodeURIComponent(selectedSlot.timeRange)}`,
            `price=${selectedSlot.price}`,
        ].join("&");
        wx.navigateTo({
            url: `/pages/venue/court/court?${params}`,
            complete: () => this.setData({ navigating: false }),
        });
    },
});
