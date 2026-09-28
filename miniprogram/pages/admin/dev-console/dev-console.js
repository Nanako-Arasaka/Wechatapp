"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const admin_service_1 = require("../../../services/admin.service");
const admin_guard_1 = require("../../../utils/admin-guard");
const auth_1 = require("../../../store/auth");
Page({
    data: { submitting: false },
    onShow() {
        (0, admin_guard_1.guardAdminPage)();
    },
    async handleGeneratePeak() {
        if (!auth_1.AuthStore.isSuperAdmin() || this.data.submitting)
            return;
        this.setData({ submitting: true });
        try {
            const res = await admin_service_1.AdminService.devGeneratePeak();
            wx.showModal({
                title: '注入成功！',
                content: res.message || '今日晚高峰已成功设为【爆满】状态，可去实时监控大屏查看！',
                showCancel: false,
            });
        }
        catch (err) {
            // 异常已处理
        }
        finally {
            this.setData({ submitting: false });
        }
    },
    async handleExpireOrders() {
        if (!auth_1.AuthStore.isSuperAdmin() || this.data.submitting)
            return;
        this.setData({ submitting: true });
        try {
            const res = await admin_service_1.AdminService.devExpireOrders();
            wx.showModal({
                title: '扫描完成',
                content: res.message || '已成功扫描超时待支付订单并释放库存。',
                showCancel: false,
            });
        }
        catch (err) {
            // 异常已处理
        }
        finally {
            this.setData({ submitting: false });
        }
    },
    goToDashboard() {
        wx.navigateTo({ url: '/pages/admin/dashboard/dashboard' });
    },
});
