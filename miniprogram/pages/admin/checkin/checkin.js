"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const admin_service_1 = require("../../../services/admin.service");
const format_1 = require("../../../utils/format");
const admin_guard_1 = require("../../../utils/admin-guard");
Page({
    data: {
        inputCode: '',
        demoCode: '',
        verifyResult: null,
        confirming: false,
        parsing: false,
        isDev: false,
    },
    onLoad() {
        const todayStr = (0, format_1.formatDate)(new Date(), 'YYYYMMDD');
        let isDev = false;
        try {
            isDev = wx.getAccountInfoSync().miniProgram.envVersion === 'develop';
        }
        catch (e) { }
        this.setData({
            demoCode: `SV${todayStr}0888`,
            isDev,
        });
    },
    onShow() {
        (0, admin_guard_1.guardAdminPage)();
    },
    onCodeInput(e) {
        this.setData({ inputCode: e.detail.value });
    },
    fillDemoCode(e) {
        const code = e.currentTarget.dataset.code;
        this.setData({ inputCode: code });
        this.verify(code);
    },
    handleManualVerify() {
        if (!this.data.inputCode.trim()) {
            wx.showToast({ title: '请输入核销码', icon: 'none' });
            return;
        }
        this.verify(this.data.inputCode.trim());
    },
    handleScanCode() {
        wx.scanCode({
            onlyFromCamera: false,
            scanType: ['qrCode'],
            success: (res) => {
                const raw = res.result;
                this.setData({ inputCode: raw });
                this.verify(raw);
            },
            fail: (err) => {
                if (err.errMsg && !err.errMsg.includes('cancel')) {
                    wx.showToast({ title: '扫码失败，请重试', icon: 'none' });
                }
            },
        });
    },
    async verify(code) {
        if (this.data.parsing)
            return;
        this.setData({ parsing: true });
        try {
            const res = await admin_service_1.AdminService.verifyCheckin(code);
            this.setData({ verifyResult: res });
            wx.showToast({ title: '解析成功', icon: 'success' });
        }
        catch (err) {
            this.setData({ verifyResult: null });
            // 错误由 request 拦截器弹 Toast (例如重复核销提示)
        }
        finally {
            this.setData({ parsing: false });
        }
    },
    async onConfirmCheckin() {
        if (!this.data.verifyResult)
            return;
        this.setData({ confirming: true });
        try {
            const res = await admin_service_1.AdminService.confirmCheckin(this.data.verifyResult.bookingId);
            wx.showModal({
                title: '核销成功！',
                content: `已成功为【${this.data.verifyResult.userName}】办理【${this.data.verifyResult.venueName}】入场核销。`,
                showCancel: false,
                success: () => {
                    this.setData({ verifyResult: null, inputCode: '' });
                },
            });
        }
        catch (err) {
            // 异常已处理
        }
        finally {
            this.setData({ confirming: false });
        }
    },
});
