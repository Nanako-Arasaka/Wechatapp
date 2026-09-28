"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const admin_service_1 = require("../../../services/admin.service");
const admin_guard_1 = require("../../../utils/admin-guard");
Page({
    data: {
        venueStatusList: [],
        timer: null,
    },
    onShow() {
        if (!(0, admin_guard_1.guardAdminPage)())
            return;
        this.loadRealtimeData();
        this.startPolling();
    },
    onHide() {
        this.stopPolling();
    },
    onUnload() {
        this.stopPolling();
    },
    onPullDownRefresh() {
        this.loadRealtimeData().then(() => {
            wx.stopPullDownRefresh();
        });
    },
    startPolling() {
        this.stopPolling();
        const timer = setInterval(() => {
            this.loadRealtimeData(true);
        }, 30000);
        this.setData({ timer });
    },
    stopPolling() {
        if (this.data.timer) {
            clearInterval(this.data.timer);
            this.setData({ timer: null });
        }
    },
    async loadRealtimeData(silent = false) {
        try {
            const list = await admin_service_1.AdminService.getRealtimeStatus();
            this.setData({ venueStatusList: list });
            if (!silent) {
                wx.showToast({ title: '实时监控已同步', icon: 'none' });
            }
        }
        catch (err) {
            console.error('加载实时监控数据失败:', err);
        }
    },
});
