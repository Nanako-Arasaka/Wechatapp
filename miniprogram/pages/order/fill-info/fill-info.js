"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auth_1 = require("../../../store/auth");
 const safeDecode = (s = '') => {
    try { return decodeURIComponent(s); } catch (e) { return s; }
};
/**
 * ============================================================================
 * P4 填写预约信息页 (FillInfoPage)
 * ----------------------------------------------------------------------------
 * 接收 booking.js 跳过来的预约基础信息（场馆/时段/数量），
 * 收集「学号 / 姓名 / 手机号」三项联系方式，本地校验后跳到 P5 确认页。
 *
 * 数据流：
 *   P2 booking → P4 fill-info → P5 confirm → pay → P6 success
 *
 * 学号 / 姓名 / 手机号三项必填，随 createBooking 一并入库，供入场核验。
 * ============================================================================
 */
Page({
    data: {
        // 来自 P2 booking 的基础信息
        venueId: '',
        venueName: '',
        venueAddress: '',
        slotId: '',
        date: '',
        timeRange: '',
        unitPrice: 0, // 分
        quantity: 1,
        courtNo: 0, // 选中的场地编号（0 = 未选场地流程）
        // 用户填写
        studentNo: '',
        contactName: '',
        contactPhone: '',
        // UI 状态
        submitting: false,
    },


 

onLoad(options) {
    const user = auth_1.AuthStore.getUser();
    this.setData({
        venueId: options.venueId || '',
        venueName: safeDecode(options.venueName || '预约场馆'),
        venueAddress: safeDecode(options.venueAddress || ''),
        slotId: options.slotId || '',
        date: safeDecode(options.date || ''),
        timeRange: safeDecode(options.timeRange || ''),  // ← 补上
        unitPrice: Number(options.unitPrice || 0),
        quantity: Number(options.quantity || 1),
        courtNo: Number(options.courtNo || 0),
        contactName: user ? user.nickname : '',
        contactPhone: user && user.phone ? user.phone : '',
    });
},
    onInputStudentNo(e) {
        // 仅允许数字，最长 12 位
        const v = (e.detail.value || '').replace(/\D/g, '').slice(0, 12);
        this.setData({ studentNo: v });
    },
    onInputName(e) {
        this.setData({ contactName: e.detail.value || '' });
    },
    onInputPhone(e) {
        const v = (e.detail.value || '').replace(/\D/g, '').slice(0, 11);
        this.setData({ contactPhone: v });
    },
    onClickNext() {
        if (this.data.submitting)
            return;
        const { studentNo, contactName, contactPhone, venueName, venueAddress, slotId, date, timeRange, unitPrice, quantity, venueId, courtNo, } = this.data;
        // 学号校验：6-12 位数字
        if (!/^\d{6,12}$/.test(studentNo)) {
            wx.showToast({ title: '请输入 6-12 位数字学号', icon: 'none' });
            return;
        }
        // 姓名校验：非空，长度 <= 20
        if (!contactName.trim()) {
            wx.showToast({ title: '请输入真实姓名', icon: 'none' });
            return;
        }
        if (contactName.trim().length > 20) {
            wx.showToast({ title: '姓名不能超过 20 个字符', icon: 'none' });
            return;
        }
        // 手机校验：1[3-9] 开头 11 位
        if (!/^1[3-9]\d{9}$/.test(contactPhone)) {
            wx.showToast({ title: '请输入正确的 11 位手机号', icon: 'none' });
            return;
        }
        // 跳 P5 confirm，11 个参数全量透传
        const params = [
            `venueId=${encodeURIComponent(venueId)}`,
            `venueName=${encodeURIComponent(venueName)}`,
            `venueAddress=${encodeURIComponent(venueAddress)}`,
            `slotId=${encodeURIComponent(slotId)}`,
            `date=${encodeURIComponent(date)}`,
            `timeRange=${encodeURIComponent(timeRange)}`,
            `unitPrice=${unitPrice}`,
            `quantity=${quantity}`,
            `studentNo=${encodeURIComponent(studentNo)}`,
            `contactName=${encodeURIComponent(contactName.trim())}`,
            `contactPhone=${encodeURIComponent(contactPhone)}`,
            `courtNo=${courtNo || 0}`,
        ].join('&');
        this.setData({ submitting: true });
        wx.navigateTo({
            url: `/pages/order/confirm/confirm?${params}`,
            success: () => {
                this.setData({ submitting: false });
            },
            fail: () => {
                this.setData({ submitting: false });
                wx.showToast({ title: '页面跳转失败', icon: 'none' });
            },
        });
    },
});