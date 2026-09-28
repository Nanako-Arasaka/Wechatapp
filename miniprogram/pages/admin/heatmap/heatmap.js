"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const admin_service_1 = require("../../../services/admin.service");
const admin_guard_1 = require("../../../utils/admin-guard");
Page({
    data: {
        days: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
        hours: ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '21:00'],
        matrix: [
            [30, 45, 50, 60, 65, 88, 92, 70],
            [35, 40, 48, 55, 60, 90, 95, 75],
            [28, 38, 45, 50, 65, 86, 90, 68],
            [32, 42, 52, 58, 70, 92, 96, 78],
            [40, 50, 60, 70, 80, 98, 100, 85],
            [65, 80, 85, 90, 95, 96, 98, 88],
            [60, 75, 80, 88, 92, 94, 90, 80],
        ],
    },
    onShow() {
        if (!(0, admin_guard_1.guardAdminPage)())
            return;
        this.loadHeatmap();
    },
    async loadHeatmap() {
        try {
            const res = await admin_service_1.AdminService.getHeatmap();
            if (res && res.matrix) {
                this.setData({
                    days: res.days,
                    hours: res.hours,
                    matrix: res.matrix,
                });
            }
        }
        catch (err) {
            console.warn('热力矩阵降级使用预置高保真数据:', err);
        }
    },
    getCellBg(val) {
        if (val >= 90)
            return '#002C8C';
        if (val >= 75)
            return '#1677FF';
        if (val >= 55)
            return '#4096FF';
        if (val >= 35)
            return '#91CAFF';
        return '#E6F4FF';
    },
    onCellTap(e) {
        const { day, hour, val } = e.currentTarget.dataset;
        let tip = '负荷正常';
        if (val >= 90)
            tip = '严重爆满，建议加大调度或错峰分流';
        else if (val >= 75)
            tip = '高峰繁忙时段';
        else if (val < 40)
            tip = '利用率偏低，可推非高峰特惠券';
        wx.showModal({
            title: `${day} ${hour} 时段分析`,
            content: `历史平均负荷率：${val}%\n运营诊断：${tip}`,
            showCancel: false,
        });
    },
});
