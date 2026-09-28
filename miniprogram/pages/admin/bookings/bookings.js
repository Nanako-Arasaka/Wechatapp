"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const admin_service_1 = require("../../../services/admin.service");
const admin_guard_1 = require("../../../utils/admin-guard");
Page({
    data: {
        bookings: [],
        keyword: '',
        currentStatus: 'ALL',
        statusTabs: [
            { key: 'ALL', label: '全部' },
            { key: 'CONFIRMED', label: '待核销' },
            { key: 'CHECKED_IN', label: '已入场' },
            { key: 'COMPLETED', label: '已完成' },
            { key: 'REFUNDED', label: '已退款' },
        ],
    },
    onShow() {
        if (!(0, admin_guard_1.guardAdminPage)())
            return;
        this.loadBookings();
    },
    onPullDownRefresh() {
        this.loadBookings().then(() => {
            wx.stopPullDownRefresh();
        });
    },
    onInputKeyword(e) {
        this.setData({ keyword: e.detail.value });
    },
    onSelectStatus(e) {
        const key = e.currentTarget.dataset.key;
        this.setData({ currentStatus: key });
        this.loadBookings();
    },
    async loadBookings() {
        try {
            const res = await admin_service_1.AdminService.getBookings({
                page: 1,
                pageSize: 50,
                status: this.data.currentStatus !== 'ALL' ? this.data.currentStatus : undefined,
                keyword: this.data.keyword || undefined,
            });
            this.setData({ bookings: res.list || [] });
        }
        catch (err) {
            console.error('加载预约列表失败:', err);
        }
    },
    async quickCheckin(e) {
        const bookingId = e.currentTarget.dataset.id;
        wx.showModal({
            title: '确认一键核销？',
            content: '确认核销该客户的场地预约并允许其入场？',
            success: async (res) => {
                if (res.confirm) {
                    try {
                        await admin_service_1.AdminService.confirmCheckin(bookingId);
                        wx.showToast({ title: '核销成功，已入场', icon: 'success' });
                        this.loadBookings();
                    }
                    catch (err) {
                        // 异常已处理
                    }
                }
            },
        });
    },
});
