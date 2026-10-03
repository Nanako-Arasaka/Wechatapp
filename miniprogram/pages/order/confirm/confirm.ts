import { BookingService } from '../../../services/booking.service';
import { safeDecode } from '../../../utils/format';
import { guardLoginPage } from '../../../utils/auth-guard';

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

  onLoad(options: Record<string, string | undefined>) {
    this.setData({
      venueId: options.venueId || '',
      venueName: safeDecode(options.venueName || ''),
      venueAddress: safeDecode(options.venueAddress || ''),
      slotId: options.slotId || '',
      date: safeDecode(options.date || ''),
      timeRange: safeDecode(options.timeRange || ''),
      unitPrice: Number(options.unitPrice || 0),
      quantity: Number(options.quantity || 1),
      courtNo: Number(options.courtNo || 0) || 0,
      studentNo: safeDecode(options.studentNo || ''),
      contactName: safeDecode(options.contactName || ''),
      contactPhone: safeDecode(options.contactPhone || ''),
    });
  },

  onShow() {
    // 预约必须登录：防止通过分享 URL 未登录直达确认订单页
    if (!guardLoginPage()) return;
  },

  onMaskTap() {
    if (this.data.submitting) return;
    wx.navigateBack({ delta: 1 });
  },

  onModify() {
    if (this.data.submitting) return;
    wx.navigateBack({ delta: 1 });
  },

  async onConfirmSheet() {
    if (this.data.submitting) return;
    if (this.data.createdOrderId) {
      this.goToPayment();
      return;
    }
    const {
      venueId,
      slotId,
      quantity,
      contactName,
      contactPhone,
      studentNo,
      courtNo,
    } = this.data;

    if (
      !venueId ||
      !slotId ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      !/^\d{6,12}$/.test(studentNo) ||
      !contactName.trim() ||
      !/^1[3-9]\d{9}$/.test(contactPhone)
    ) {
      wx.showToast({ title: '预约信息不完整，请返回检查', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    try {
      const res: any = await BookingService.createBooking({
        venueId,
        slotId,
        quantity,
        contactName,
        contactPhone,
        studentNo,
        courtNo: courtNo || undefined,
      } as any);
      const orderId = res && res.orderId;
      if (!orderId) {
        throw new Error('下单失败：未返回订单号');
      }
      this.setData({ createdOrderId: orderId });
      this.goToPayment();
    } catch (err: any) {
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

  noBubble() {},
});
