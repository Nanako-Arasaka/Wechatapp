"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const venue_service_1 = require("../../../services/venue.service");
const format_1 = require("../../../utils/format");
/**
 * ============================================================================
 * P2 选择时间页 (BookingPage)
 * ----------------------------------------------------------------------------
 * 用户目标：选择 1 小时预约时段，仅支持当天预约。
 * 核心交互逻辑：
 * 1. 仅当天：进入页面自动加载今日（GET /venues/:id/availability?date=今天）时段。
 * 2. 小时格子时间选择组件：
 *    灰色色块 = 不可预约时段（已过时段/闭馆/已满），可选时段支持点击选中。
 * 3. 选中时段后展示摘要信息（场馆、日期、时间段、单价）。
 * 4. 点击【下一步】携带参数路由跳转至 P3 可选场地页（venue/court）。
 * ============================================================================
 */
Page({
    data: {
        id: '', // 场馆 ID
        venue: {}, // 场馆信息
        today: '', // 今日日期 YYYY-MM-DD
        todayText: '', // 今日展示文本，如「2026-09-24 周四」
        slots: [], // 今日全部小时时段
        selectedSlotId: '', // 当前选中的时段 ID
        selectedSlot: null, // 当前选中的时段对象
        selectedPriceText: '', // 选中时段单价展示文本
        isClosed: false, // 场馆今日是否闭馆
        closedReason: '', // 闭馆原因
        loading: true,
        loadError: false, // 加载失败标记（展示错误占位与重试）
        navigating: false, // 下一步跳转防连点
    },
    onLoad(options) {
        if (options && options.id) {
            this.setData({ id: options.id });
            // 初始化今日日期展示
            const today = (0, format_1.formatDate)(new Date(), 'YYYY-MM-DD');
            this.setData({
                today,
                todayText: `${today} ${(0, format_1.getWeekdayName)(today)}`,
            });
            this.loadVenueAndTodaySlots(options.id, options.slotId);
        }
    },
    /**
     * 加载场馆详情 + 今日时段余量
     * @param venueId 场馆 ID
     * @param preselectSlotId 外部携带的预选时段 ID（可选，首页快速预约直达场景）
     */
    async loadVenueAndTodaySlots(venueId, preselectSlotId) {
        try {
            const today = (0, format_1.formatDate)(new Date(), 'YYYY-MM-DD');
            this.setData({ loading: true, loadError: false, selectedSlotId: '', selectedSlot: null, selectedPriceText: '' });
            // 并行请求：场馆详情 + 今日时段可用状态（GET /venues/:id/availability）
            const [venue, avail] = await Promise.all([
                venue_service_1.VenueService.getVenueDetail(venueId),
                venue_service_1.VenueService.getAvailability(venueId, today),
            ]);
            this.setData({
                venue,
                today,
                todayText: `${today} ${(0, format_1.getWeekdayName)(today)}`,
                slots: avail.slots,
                isClosed: avail.isClosed,
                closedReason: avail.closedReason || '',
                selectedSlotId: '',
                selectedSlot: null,
                selectedPriceText: '',
            });
            // 支持外部携带 preselectSlotId 直达选中（该时段须仍可选）
            if (preselectSlotId && !avail.isClosed) {
                const found = avail.slots.find((s) => s.id === preselectSlotId && s.isSelectable);
                if (found) {
                    this.applySelectedSlot(found);
                }
            }
        }
        catch (err) {
            console.error('加载场馆与今日时段失败:', err);
            this.setData({ loadError: true, slots: [], selectedSlotId: '', selectedSlot: null, selectedPriceText: '' });
        }
        finally {
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
        if (!slot.isSelectable) {
            // 灰色不可预约时段：轻提示拦截
            wx.showToast({ title: `该时段不可预约（${slot.statusText}）`, icon: 'none' });
            return;
        }
        this.applySelectedSlot(slot);
    },
    /**
     * 应用选中时段并刷新摘要信息
     */
    applySelectedSlot(slot) {
        this.setData({
            selectedSlotId: slot.id,
            selectedSlot: slot,
            selectedPriceText: (0, format_1.formatMoney)(slot.price),
        });
    },
    /**
     * 点击【下一步】：携带预约基础信息跳转 P3 可选场地页
     */
    goToCourtSelect() {
        if (this.data.navigating || this.data.loading || this.data.loadError)
            return;
        if (!this.data.selectedSlot) {
            wx.showToast({ title: '请先选择预约时段', icon: 'none' });
            return;
        }
        this.setData({ navigating: true });
        const { id, venue, today, selectedSlot } = this.data;
        const params = [
            `venueId=${encodeURIComponent(id)}`,
            `venueName=${encodeURIComponent(venue.name || '')}`,
            `venueAddress=${encodeURIComponent(venue.address || '')}`,
            `slotId=${encodeURIComponent(selectedSlot.id)}`,
            `date=${encodeURIComponent(today)}`,
            `timeRange=${encodeURIComponent(selectedSlot.timeRange)}`,
            `price=${selectedSlot.price}`,
        ].join('&');
        wx.navigateTo({
            url: `/pages/venue/court/court?${params}`,
            complete: () => this.setData({ navigating: false }),
        });
    },
});
