"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const admin_service_1 = require("../../../services/admin.service");
const auth_1 = require("../../../store/auth");
const chart_1 = require("../../../utils/chart");
const admin_guard_1 = require("../../../utils/admin-guard");
Page({
    data: {
        adminName: '管理员',
        kpi: {},
        kpiLoaded: false,
        lastUpdated: '',
        venueRanking: [],
        hotTimeSlots: [],
        suggestions: [],
        loading: false,
        loadError: false,
    },
    _pollTimer: null,
    onShow() {
        if (!(0, admin_guard_1.guardAdminPage)())
            return;
        const user = auth_1.AuthStore.getUser();
        if (user) {
            this.setData({ adminName: user.nickname });
        }
        this.loadDashboardData();
        this.startPolling();
    },
    onHide() {
        this.stopPolling();
    },
    onUnload() {
        this.stopPolling();
    },
    onPullDownRefresh() {
        this.loadDashboardData().finally(() => {
            wx.stopPullDownRefresh();
        });
    },
    onRefresh() {
        this.loadDashboardData();
    },
    navTo(e) {
        const url = e.currentTarget.dataset.url;
        if (url.startsWith('/pages/venue/list/list') || url.startsWith('/pages/order/list/list') || url.startsWith('/pages/user/profile/profile')) {
            wx.switchTab({ url });
        }
        else {
            wx.navigateTo({ url });
        }
    },
    startPolling() {
        this.stopPolling();
        const pollTimer = setInterval(() => {
            this.loadDashboardData(true);
        }, 30000); // 30秒静默轮询
        this._pollTimer = pollTimer;
    },
    stopPolling() {
        if (this._pollTimer) {
            clearInterval(this._pollTimer);
            this._pollTimer = null;
        }
    },
    async loadDashboardData(silent = false) {
        if (this.data.loading)
            return;
        this.setData({ loading: true, loadError: false });
        try {
            const data = await admin_service_1.AdminService.getDashboardOverview();
            const now = new Date();
            const pad = (n) => String(n).padStart(2, '0');
            const lastUpdated = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
            this.setData({
                kpi: data.kpi,
                kpiLoaded: true,
                lastUpdated,
                venueRanking: data.venueRanking || [],
                hotTimeSlots: data.hotTimeSlots || [],
                suggestions: data.suggestions || [],
            });
            // 绘制近7天营收折线图
            const lineData = data.incomeTrend.map((d) => ({
                date: d.date,
                value: d.income,
            }));
            chart_1.CanvasChart.drawInPage('incomeTrendCanvas', this, (width, height) => {
                chart_1.CanvasChart.drawLineChart('incomeTrendCanvas', lineData, width, height, this, '#1677FF', true);
            });
            // 绘制场馆占比环形饼图
            const pieData = data.venuePieData.map((d) => ({
                name: d.name,
                value: d.value,
                percentage: d.percentage,
            }));
            chart_1.CanvasChart.drawInPage('venuePieCanvas', this, (width, height) => {
                chart_1.CanvasChart.drawDonutChart('venuePieCanvas', pieData, width, height, this);
            });
            if (!silent) {
                wx.showToast({ title: '数据已实时同步', icon: 'none' });
            }
        }
        catch (err) {
            console.error('加载 Dashboard 失败:', err);
            this.setData({ loadError: true });
        }
        finally {
            this.setData({ loading: false });
        }
    },
});
