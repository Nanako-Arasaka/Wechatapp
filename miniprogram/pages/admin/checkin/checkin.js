"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const admin_service_1 = require("../../../services/admin.service");
const admin_guard_1 = require("../../../utils/admin-guard");
Page({
    data: {
        inputCode: '',
        verifyResult: null,
        confirming: false,
        parsing: false,
    },
    onShow() {
        (0, admin_guard_1.guardAdminPage)();
    },
    onCodeInput(e) {
        if (this.data.parsing || this.data.confirming)
            return;
        this.setData({ inputCode: e.detail.value, verifyResult: null });
    },
    handleManualVerify() {
        if (!this.data.inputCode.trim()) {
            wx.showToast({ title: '请输入核销码', icon: 'none' });
            return;
        }
        this.verify(this.data.inputCode.trim());
    },
    handleScanCode() {
        if (this.data.parsing || this.data.confirming)
            return;
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
        if (this.data.parsing || this.data.confirming)
            return;
        this.setData({ parsing: true, verifyResult: null });
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
        if (!this.data.verifyResult?.canConfirm || this.data.confirming || this.data.parsing)
            return;
        const booking = this.data.verifyResult;
        this.setData({ confirming: true });
        try {
            await admin_service_1.AdminService.confirmCheckin(booking.bookingId);
            this.setData({ verifyResult: null, inputCode: '' });
            wx.showModal({
                title: '核销成功！',
                content: `已为【${booking.userName}】办理【${booking.venueName}】入场核销。` +
                    (booking.companionName ? `\n同行人【${booking.companionName}】需一同入场，请核验证件。` : ''),
                showCancel: false,
                success: () => {
                    this.setData({ verifyResult: null, inputCode: '' });
                },
            });
        }
        catch (err) {
            this.setData({ verifyResult: null });
        }
        finally {
            this.setData({ confirming: false });
        }
    },
});
