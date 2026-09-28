"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const booking_service_1 = require("../../../services/booking.service");
const { safeDecode } = require("../../../utils/format");
/**
 * ============================================================================
 * P5 确认预约信息页 (ConfirmSheetPage)
 * ----------------------------------------------------------------------------
 * 整页 = mask 半透明遮罩 + 底部弹出 sheet。
 * Sheet 内展示六行信息：场地 / 日期 / 时间 / 学号 / 姓名 / 联系方式。
 * 「再想想」回退到 P4；「确认预约」调 BookingService.createBooking
 *   （姓名 / 学号 / 手机号三项必填，随预约入库，供入场核验）；
 *   拿到 orderId 后 navigateTo pay，pay 内部继续 redirectTo 到 P6 success。
 *
 * createBooking 后端返回：{ bookingId, bookingNo, bookingCode, orderId, orderNo, amount, ... }
 * ============================================================================
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
            venueName: safeDecode(options.venueName || ''),
            venueAddress: safeDecode(options.venueAddress || ''),
            slotId: options.slotId || '',
            date: safeDecode(options.date || ''),
            timeRange: safeDecode(options.timeRange || ''),
            unitPrice: Number(options.unitPrice || 0),
            quantity: Number(options.quantity || 1),
            courtNo: Number(options.courtNo || 0),
            studentNo: safeDecode(options.studentNo || ''),
            contactName: safeDecode(options.contactName || ''),
            contactPhone: safeDecode(options.contactPhone || ''),
        });
    },
    /** 点击遮罩 = 「再想想」 */
    onMaskTap() {
        if (this.data.submitting) return;
        wx.navigateBack({ delta: 1 });
    },
    /** 「再想想」按钮 */
    onModify() {
        if (this.data.submitting) return;
        wx.navigateBack({ delta: 1 });
    },
    /** 「确认预约」按钮：调 createBooking，跳 pay */
    async onConfirmSheet() {
        if (this.data.submitting)
            return;
        if (this.data.createdOrderId) {
            this.goToPayment();
            return;
        }
        const { venueId, slotId, quantity, contactName, contactPhone, studentNo, courtNo, } = this.data;
        if (!venueId || !slotId || !Number.isInteger(quantity) || quantity < 1 || !/^\d{6,12}$/.test(studentNo) || !contactName.trim() || !/^1[3-9]\d{9}$/.test(contactPhone)) {
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
                content: (err && (err.message || err.errMsg)) || '请稍后再试',
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
    /** 阻止 sheet 内 touch 冒泡到 mask */
    noBubble() { },
});
