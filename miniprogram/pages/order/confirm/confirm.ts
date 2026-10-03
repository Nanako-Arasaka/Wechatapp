import { BookingService } from '../../../services/booking.service';
import { safeDecode } from '../../../utils/format';
import { guardLoginPage } from '../../../utils/auth-guard';
import {
  IdentityType,
  validatePerson,
  maskIdentityNo,
} from '../../../utils/identity';

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
    identityType: 'STUDENT' as IdentityType,
    studentNo: '',
    contactName: '',
    contactPhone: '',
    identityNoMasked: '',
    companionEnabled: false,
    companionName: '',
    companionPhone: '',
    companionIdentityType: 'VISITOR' as IdentityType,
    companionIdentityNo: '',
    companionNoMasked: '',
    submitting: false,
    createdOrderId: '',
  },

  onLoad(options: Record<string, string | undefined>) {
    const identityType = (options.identityType || 'STUDENT') as IdentityType;
    const companionEnabled = options.companionEnabled === '1';
    const companionIdentityType = (options.companionIdentityType ||
      'VISITOR') as IdentityType;
    const studentNo = safeDecode(options.studentNo || '');
    const companionIdentityNo = safeDecode(options.companionIdentityNo || '');

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
      identityType,
      studentNo,
      contactName: safeDecode(options.contactName || ''),
      contactPhone: safeDecode(options.contactPhone || ''),
      identityNoMasked: maskIdentityNo(studentNo),
      companionEnabled,
      companionName: safeDecode(options.companionName || ''),
      companionPhone: safeDecode(options.companionPhone || ''),
      companionIdentityType,
      companionIdentityNo,
      companionNoMasked: maskIdentityNo(companionIdentityNo),
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
      identityType,
      companionEnabled,
      companionName,
      companionPhone,
      companionIdentityType,
      companionIdentityNo,
    } = this.data;

    if (
      !venueId ||
      !slotId ||
      !Number.isInteger(quantity) ||
      quantity < 1
    ) {
      wx.showToast({ title: '预约信息不完整，请返回检查', icon: 'none' });
      return;
    }

    // 证件规则随身份变化，这里必须重新校验，不能信任上游页面
    const selfError = validatePerson(
      { name: contactName, phone: contactPhone, identityType, identityNo: studentNo },
      '',
    );
    if (selfError) {
      wx.showToast({ title: selfError, icon: 'none' });
      return;
    }

    if (companionEnabled) {
      const companionError = validatePerson(
        {
          name: companionName,
          phone: companionPhone,
          identityType: companionIdentityType,
          identityNo: companionIdentityNo,
        },
        '同行人',
      );
      if (companionError) {
        wx.showToast({ title: companionError, icon: 'none' });
        return;
      }
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
        // 后端落库字段待定：先按契约透传，未接收时不影响原有下单
        identityType,
        companionName: companionEnabled ? companionName : undefined,
        companionPhone: companionEnabled ? companionPhone : undefined,
        companionIdentityType: companionEnabled ? companionIdentityType : undefined,
        companionIdentityNo: companionEnabled ? companionIdentityNo : undefined,
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
