"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const admin_service_1 = require("../../../services/admin.service");
const chart_1 = require("../../../utils/chart");
const admin_guard_1 = require("../../../utils/admin-guard");
Page({
    data: {
        kpi: {},
    },
    onShow() {
        if (!(0, admin_guard_1.guardAdminPage)())
            return;
        this.loadData();
    },
    onPullDownRefresh() {
        this.loadData().then(() => {
            wx.stopPullDownRefresh();
        });
    },
    async loadData() {
        try {
            const data = await admin_service_1.AdminService.getDashboardOverview();
            this.setData({ kpi: data.kpi });
            // 绘制折线图
            const lineData = data.incomeTrend.map((d) => ({
                date: d.date,
                value: d.income,
            }));
            setTimeout(() => {
                chart_1.CanvasChart.drawLineChart('settleTrendCanvas', lineData, 320, 180, this, '#00B96B', true);
            }, 100);
            // 绘制环形饼图
            const pieData = data.venuePieData.map((d) => ({
                name: d.name,
                value: d.value,
                percentage: d.percentage,
            }));
            setTimeout(() => {
                chart_1.CanvasChart.drawDonutChart('settlePieCanvas', pieData, 320, 160, this);
            }, 150);
        }
        catch (err) {
            console.error('加载资金看板失败:', err);
        }
    },
});
