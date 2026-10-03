"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const booking_service_1 = require("../../../services/booking.service");
const format_1 = require("../../../utils/format");
const auth_guard_1 = require("../../../utils/auth-guard");
/**
 * P5 确认预约信息（底部 sheet）
 * createBooking → 支付页 pay → success
 */
Page({
    data: {
        venueId: '',
        venueName: '',
        venueAddress: '',
        slotId: '',
        date: '',
        timeRange: '',
        unitPrice: 0,
        quantity: 1,
        courtNo: 0,
        studentNo: '',
        contactName: '',
        contactPhone: '',
        submitting: false,
        createdOrderId: '',
    },
    onLoad(options) {
        this.setData({
            venueId: options.venueId || '',
            venueName: (0, format_1.safeDecode)(options.venueName || ''),
            venueAddress: (0, format_1.safeDecode)(options.venueAddress || ''),
            slotId: options.slotId || '',
            date: (0, format_1.safeDecode)(options.date || ''),
            timeRange: (0, format_1.safeDecode)(options.timeRange || ''),
            unitPrice: Number(options.unitPrice || 0),
            quantity: Number(options.quantity || 1),
            courtNo: Number(options.courtNo || 0) || 0,
            studentNo: (0, format_1.safeDecode)(options.studentNo || ''),
            contactName: (0, format_1.safeDecode)(options.contactName || ''),
            contactPhone: (0, format_1.safeDecode)(options.contactPhone || ''),
        });
    },
    onShow() {
        // 预约必须登录：防止通过分享 URL 未登录直达确认订单页
        if (!(0, auth_guard_1.guardLoginPage)())
            return;
    },
    onMaskTap() {
        if (this.data.submitting)
            return;
        wx.navigateBack({ delta: 1 });
    },
    onModify() {
        if (this.data.submitting)
            return;
        wx.navigateBack({ delta: 1 });
    },
    async onConfirmSheet() {
        if (this.data.submitting)
            return;
        if (this.data.createdOrderId) {
            this.goToPayment();
            return;
        }
        const { venueId, slotId, quantity, contactName, contactPhone, studentNo, courtNo, } = this.data;
        if (!venueId ||
            !slotId ||
            !Number.isInteger(quantity) ||
            quantity < 1 ||
            !/^\d{6,12}$/.test(studentNo) ||
            !contactName.trim() ||
            !/^1[3-9]\d{9}$/.test(contactPhone)) {
            wx.showToast({ title: '预约信息不完整，请返回检查', icon: 'none' });
            return;
        }
        this.setData({ submitting: true });
        try {
            const res = await booking_service_1.BookingService.createBooking({
                venueId,
                slotId,
                quantity,
                contactName,
                contactPhone,
                studentNo,
                courtNo: courtNo || undefined,
            });
            const orderId = res && res.orderId;
            if (!orderId) {
                throw new Error('下单失败：未返回订单号');
            }
            this.setData({ createdOrderId: orderId });
            this.goToPayment();
        }
        catch (err) {
            this.setData({ submitting: false });
            wx.showModal({
                title: '预约失败',
                content: err?.message || err?.errMsg || '请稍后再试',
                showCancel: false,
                confirmText: '知道了',
            });
        }
    },
    goToPayment() {
        this.setData({ submitting: true });
        wx.redirectTo({
            url: `/pages/order/pay/pay?orderId=${encodeURIComponent(this.data.createdOrderId)}`,
            fail: () => {
                wx.showToast({ title: '订单已创建，请重试前往支付', icon: 'none' });
            },
            complete: () => this.setData({ submitting: false }),
        });
    },
    noBubble() { },
});
