"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const booking_service_1 = require("../../../services/booking.service");
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
    },
    onLoad(options) {
        this.setData({
            venueId: options.venueId || '',
            venueName: decodeURIComponent(options.venueName || ''),
            venueAddress: decodeURIComponent(options.venueAddress || ''),
            slotId: options.slotId || '',
            date: decodeURIComponent(options.date || ''),
            timeRange: decodeURIComponent(options.timeRange || ''),
            unitPrice: Number(options.unitPrice || 0),
            quantity: Number(options.quantity || 1),
            courtNo: Number(options.courtNo || 0),
            studentNo: decodeURIComponent(options.studentNo || ''),
            contactName: decodeURIComponent(options.contactName || ''),
            contactPhone: decodeURIComponent(options.contactPhone || ''),
        });
    },
    /**
     * 🆕 页面显示时重置 submitting 锁
     * 防止 navigateTo 跳走后用户意外返回（如手机返回键、跳转失败）导致按钮永久卡死
     */
     /**
     * 页面显示时重置 submitting 锁
     * 防止 navigateTo 跳走后用户意外返回（如手机返回键、跳转失败）导致按钮永久卡死
     */
  
    onShow() {
        if (this.data.submitting) {
            this.setData({ submitting: false });
        }
    },
    /** 点击遮罩 = 「再想想」 */
    onMaskTap() {
        wx.navigateBack({ delta: 1 });
    },
    /** 「再想想」按钮 */
    onModify() {
        wx.navigateBack({ delta: 1 });
    },
    /** 「确认预约」按钮：调 createBooking，跳 pay */
    async onConfirmSheet() {
        if (this.data.submitting)
            return;
        const { venueId, slotId, quantity, contactName, contactPhone, studentNo, courtNo, } = this.data;
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
            wx.showToast({ title: '锁定成功', icon: 'success' });
            setTimeout(() => { // 🆕 200ms（原来是 500）
                wx.navigateTo({
                    url: `/pages/order/pay/pay?orderId=${orderId}` +
                        `&studentNo=${encodeURIComponent(studentNo)}` +
                        `&contactName=${encodeURIComponent(contactName)}` +
                        `&contactPhone=${encodeURIComponent(contactPhone)}`,
                });
            }, 200);
        }
        catch (err) {
            // 错误不静默：弹窗 + 回 P4 让用户改
            this.setData({ submitting: false });
            wx.showModal({
                title: '预约失败',
                content: (err && (err.message || err.errMsg)) || '请稍后再试',
                showCancel: false,
                confirmText: '返回修改',
                success: () => {
                    wx.navigateBack({ delta: 1 });
                },
            });
        }
    },
    /** 阻止 sheet 内 touch 冒泡到 mask */
    noBubble() { },
});
