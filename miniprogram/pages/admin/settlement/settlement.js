"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const admin_service_1 = require("../../../services/admin.service");
const chart_1 = require("../../../utils/chart");
const admin_guard_1 = require("../../../utils/admin-guard");
Page({
    data: {
        kpi: {},
        loading: true,
        loadError: false,
    },
    onShow() {
        if (!(0, admin_guard_1.guardAdminPage)())
            return;
        this.loadData();
    },
    onPullDownRefresh() {
        this.loadData().finally(() => {
            wx.stopPullDownRefresh();
        });
    },
    async loadData() {
        this.setData({ loading: true, loadError: false });
        try {
            const data = await admin_service_1.AdminService.getDashboardOverview();
            this.setData({ kpi: data.kpi });
            // 绘制折线图
            const lineData = data.incomeTrend.map((d) => ({
                date: d.date,
                value: d.income,
            }));
            chart_1.CanvasChart.drawInPage('settleTrendCanvas', this, (width, height) => {
                chart_1.CanvasChart.drawLineChart('settleTrendCanvas', lineData, width, height, this, '#00B96B', true);
            });
            // 绘制环形饼图
            const pieData = data.venuePieData.map((d) => ({
                name: d.name,
                value: d.value,
                percentage: d.percentage,
            }));
            chart_1.CanvasChart.drawInPage('settlePieCanvas', this, (width, height) => {
                chart_1.CanvasChart.drawDonutChart('settlePieCanvas', pieData, width, height, this);
            });
        }
        catch (err) {
            console.error('加载资金看板失败:', err);
            this.setData({ loadError: true, kpi: {} });
        }
        finally {
            this.setData({ loading: false });
        }
    },
});
