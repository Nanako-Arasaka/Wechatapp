import { AuthStore } from '../../../store/auth';
import { guardLoginPage } from '../../../utils/auth-guard';
import {
  IdentityType,
  IDENTITY_LABEL,
  IDENTITY_PLACEHOLDER,
  sanitizeIdentityNo,
  sanitizeStudentNo,
  validatePerson,
} from '../../../utils/identity';

/**
 * P4 填写预约信息
 * booking → fill-info → confirm → pay → success
 *
 * 本期只面向校内场馆，但预约人可能是校外人员（陪同入场、赛事外来人员），
 * 因此「身份」显式区分在校生 / 校外人员，各自的证件规则不同。
 * 同时支持 1 位同行人，用于解决校外人员进校需登记的问题。
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

    // 预约人（我）
    identityType: 'STUDENT' as IdentityType,
    studentNo: '',
    contactName: '',
    contactPhone: '',
    identityPlaceholder: IDENTITY_PLACEHOLDER.STUDENT,

    // 同行人（最多 1 位）
    companionEnabled: false,
    companionName: '',
    companionPhone: '',
    companionIdentityType: 'VISITOR' as IdentityType,
    companionIdentityNo: '',
    companionPlaceholder: IDENTITY_PLACEHOLDER.VISITOR,

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

  /** ===== 预约人身份切换 ===== */
  onIdentityChange(e: any) {
    const identityType = e.detail.value as IdentityType;
    this.setData({
      identityType,
      identityPlaceholder: IDENTITY_PLACEHOLDER[identityType],
      // 切换身份后清空证件，避免把学号当身份证提交
      studentNo: '',
    });
  },

  onIdentityNoInput(e: { detail: { value?: string } }) {
    const raw = e.detail.value || '';
    const value =
      this.data.identityType === 'VISITOR'
        ? sanitizeIdentityNo(raw)
        : sanitizeStudentNo(raw);
    this.setData({ studentNo: value });
  },

  onInputName(e: { detail: { value?: string } }) {
    this.setData({ contactName: e.detail.value || '' });
  },

  onInputPhone(e: { detail: { value?: string } }) {
    const v = String(e.detail.value || '').replace(/\D/g, '').slice(0, 11);
    this.setData({ contactPhone: v });
  },

  /** ===== 同行人 ===== */
  onToggleCompanion() {
    const next = !this.data.companionEnabled;
    this.setData({
      companionEnabled: next,
      companionName: next ? this.data.companionName : '',
      companionPhone: next ? this.data.companionPhone : '',
      companionIdentityNo: next ? this.data.companionIdentityNo : '',
    });
  },

  onCompanionIdentityChange(e: any) {
    const companionIdentityType = e.detail.value as IdentityType;
    this.setData({ companionIdentityType, companionIdentityNo: '' });
  },

  onCompanionIdentityNoInput(e: { detail: { value?: string } }) {
    const raw = e.detail.value || '';
    const value =
      this.data.companionIdentityType === 'VISITOR'
        ? sanitizeIdentityNo(raw)
        : sanitizeStudentNo(raw);
    this.setData({ companionIdentityNo: value });
  },

  onCompanionNameInput(e: { detail: { value?: string } }) {
    this.setData({ companionName: e.detail.value || '' });
  },

  onCompanionPhoneInput(e: { detail: { value?: string } }) {
    const v = String(e.detail.value || '').replace(/\D/g, '').slice(0, 11);
    this.setData({ companionPhone: v });
  },

  onClickNext() {
    if (this.data.submitting) return;
    const {
      venueId,
      slotId,
      date,
      timeRange,
      unitPrice,
      quantity,
      venueName,
      venueAddress,
      courtNo,
      identityType,
      studentNo,
      contactName,
      contactPhone,
      companionEnabled,
      companionIdentityType,
      companionName,
      companionPhone,
      companionIdentityNo,
    } = this.data;

    if (!venueId || !slotId || !date || !timeRange) {
      wx.showToast({ title: '预约信息不完整', icon: 'none' });
      return;
    }

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

    const params = [
      `venueId=${encodeURIComponent(venueId)}`,
      `venueName=${encodeURIComponent(venueName)}`,
      `venueAddress=${encodeURIComponent(venueAddress)}`,
      `slotId=${encodeURIComponent(slotId)}`,
      `date=${encodeURIComponent(date)}`,
      `timeRange=${encodeURIComponent(timeRange)}`,
      `unitPrice=${unitPrice}`,
      `quantity=${quantity}`,
      `identityType=${identityType}`,
      // 后端 studentNo 字段沿用；校外人员改传身份证明文，避免字段扩容
      `studentNo=${encodeURIComponent(studentNo)}`,
      `contactName=${encodeURIComponent(contactName.trim())}`,
      `contactPhone=${encodeURIComponent(contactPhone)}`,
      `courtNo=${courtNo || 0}`,
      `companionEnabled=${companionEnabled ? 1 : 0}`,
      `companionName=${encodeURIComponent(companionEnabled ? companionName.trim() : '')}`,
      `companionPhone=${encodeURIComponent(companionEnabled ? companionPhone : '')}`,
      `companionIdentityType=${companionIdentityType}`,
      `companionIdentityNo=${encodeURIComponent(companionEnabled ? companionIdentityNo : '')}`,
    ].join('&');

    this.setData({ submitting: true });
    wx.navigateTo({
      url: `/pages/order/confirm/confirm?${params}`,
      complete: () => this.setData({ submitting: false }),
    });
  },

  identityLabel(type: IdentityType) {
    return IDENTITY_LABEL[type] || IDENTITY_LABEL.STUDENT;
  },
});
