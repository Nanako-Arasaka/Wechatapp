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
        pollTimer: null,
    },
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
        this.loadDashboardData().then(() => {
            wx.stopPullDownRefresh();
        });
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
        this.setData({ pollTimer });
    },
    stopPolling() {
        if (this.data.pollTimer) {
            clearInterval(this.data.pollTimer);
            this.setData({ pollTimer: null });
        }
    },
    async loadDashboardData(silent = false) {
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
            setTimeout(() => {
                chart_1.CanvasChart.drawLineChart('incomeTrendCanvas', lineData, 320, 180, this, '#1677FF', true);
            }, 100);
            // 绘制场馆占比环形饼图
            const pieData = data.venuePieData.map((d) => ({
                name: d.name,
                value: d.value,
                percentage: d.percentage,
            }));
            setTimeout(() => {
                chart_1.CanvasChart.drawDonutChart('venuePieCanvas', pieData, 320, 160, this);
            }, 150);
            if (!silent) {
                wx.showToast({ title: '数据已实时同步', icon: 'none' });
            }
        }
        catch (err) {
            console.error('加载 Dashboard 失败:', err);
        }
    },
});
