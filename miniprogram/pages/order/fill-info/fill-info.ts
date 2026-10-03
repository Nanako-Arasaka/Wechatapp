import { AuthStore } from '../../../store/auth';
import { guardLoginPage } from '../../../utils/auth-guard';

/**
 * P4 填写预约信息
 * booking → fill-info → confirm → pay → success
 */
function safeDecode(s?: string): string {
  const raw = s || '';
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function parsePositiveInt(v: string | undefined, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

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
    pageLoading: true,
  },

  onLoad(options: Record<string, string | undefined>) {
    const user = AuthStore.getUser();
    const venueId = options.venueId || '';
    const slotId = options.slotId || '';
    const date = safeDecode(options.date);
    const timeRange = safeDecode(options.timeRange);

    // 缺关键参数时给友好提示（G-2）
    if (!venueId || !slotId || !date || !timeRange) {
      this.setData({ pageLoading: false });
      wx.showModal({
        title: '预约信息不完整',
        content: '缺少场馆或时段信息，请返回重新选择。',
        showCancel: false,
        confirmText: '返回上一页',
        success: () => {
          wx.navigateBack({ delta: 1, fail: () => wx.switchTab({ url: '/pages/venue/list/list' }) });
        },
      });
      return;
    }

    this.setData({
      venueId,
      venueName: safeDecode(options.venueName) || '预约场馆',
      venueAddress: safeDecode(options.venueAddress),
      slotId,
      date,
      timeRange,
      unitPrice: parsePositiveInt(options.unitPrice, 0),
      quantity: parsePositiveInt(options.quantity, 1),
      courtNo: parsePositiveInt(options.courtNo, 0) || 0,
      contactName: user ? user.nickname : '',
      contactPhone: (user && user.phone) || '',
      pageLoading: true,
    });
    setTimeout(() => this.setData({ pageLoading: false }), 180);
  },

  onShow() {
    // 预约必须登录：防止通过分享 URL 未登录直达填写信息页
    if (!guardLoginPage()) return;
  },

  onPullDownRefresh() {
    wx.stopPullDownRefresh();
  },

  onRetry() {
    this.onLoad(this.options || {});
  },

  onInputStudentNo(e: { detail: { value?: string } }) {
    const v = String(e.detail.value || '').replace(/\D/g, '').slice(0, 12);
    this.setData({ studentNo: v });
  },

  onInputName(e: { detail: { value?: string } }) {
    this.setData({ contactName: e.detail.value || '' });
  },

  onInputPhone(e: { detail: { value?: string } }) {
    const v = String(e.detail.value || '').replace(/\D/g, '').slice(0, 11);
    this.setData({ contactPhone: v });
  },

  onClickNext() {
    if (this.data.submitting) return;
    const {
      studentNo,
      contactName,
      contactPhone,
      venueName,
      venueAddress,
      slotId,
      date,
      timeRange,
      unitPrice,
      quantity,
      venueId,
      courtNo,
    } = this.data;

    if (!venueId || !slotId || !date || !timeRange) {
      wx.showToast({ title: '预约信息不完整', icon: 'none' });
      return;
    }
    if (!/^\d{6,12}$/.test(studentNo)) {
      wx.showToast({ title: '请输入 6-12 位数字学号', icon: 'none' });
      return;
    }
    const name = contactName.trim();
    if (!name) {
      wx.showToast({ title: '请输入真实姓名', icon: 'none' });
      return;
    }
    if (name.length > 20) {
      wx.showToast({ title: '姓名不能超过 20 个字符', icon: 'none' });
      return;
    }
    if (!/^1[3-9]\d{9}$/.test(contactPhone)) {
      wx.showToast({ title: '请输入正确的 11 位手机号', icon: 'none' });
      return;
    }

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
      `contactName=${encodeURIComponent(name)}`,
      `contactPhone=${encodeURIComponent(contactPhone)}`,
      `courtNo=${courtNo || 0}`,
    ].join('&');

    this.setData({ submitting: true });
    wx.navigateTo({
      url: `/pages/order/confirm/confirm?${params}`,
      complete: () => this.setData({ submitting: false }),
    });
  },
});
