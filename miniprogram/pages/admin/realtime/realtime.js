"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const admin_service_1 = require("../../../services/admin.service");
const admin_guard_1 = require("../../../utils/admin-guard");
Page({
    data: {
        venueStatusList: [],
        loading: false,
        loadError: false,
    },
    _timer: null,
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
        this.loadRealtimeData().finally(() => {
            wx.stopPullDownRefresh();
        });
    },
    onRefresh() {
        this.loadRealtimeData();
    },
    startPolling() {
        this.stopPolling();
        const timer = setInterval(() => {
            this.loadRealtimeData(true);
        }, 30000);
        this._timer = timer;
    },
    stopPolling() {
        if (this._timer) {
            clearInterval(this._timer);
            this._timer = null;
        }
    },
    async loadRealtimeData(silent = false) {
        if (this.data.loading)
            return;
        this.setData({ loading: true, loadError: false });
        try {
            const list = await admin_service_1.AdminService.getRealtimeStatus();
            this.setData({ venueStatusList: list });
            if (!silent) {
                wx.showToast({ title: '实时监控已同步', icon: 'none' });
            }
        }
        catch (err) {
            console.error('加载实时监控数据失败:', err);
            this.setData({ loadError: true });
        }
        finally {
            this.setData({ loading: false });
        }
    },
    goToSchedule(e) {
        const venueId = e.currentTarget.dataset.venueId;
        const venueName = e.currentTarget.dataset.venueName;
        if (!venueId)
            return;
        wx.navigateTo({
            url: `/pages/admin/venue-schedule/venue-schedule?venueId=${encodeURIComponent(venueId)}&venueName=${encodeURIComponent(venueName || '')}`,
        });
    },
});
