import { OrderService } from '../../../services/order.service';
import { OrderDetail } from '../../../types';

Page({
  data: {
    orderId: '',
    order: null as OrderDetail | null,
    countdownText: '--:--',
    paying: false,
    loading: true,
    loadError: false,
    canPay: false,
    paymentNotice: '',
    remainingSeconds: 0,
  },
  _timer: null as any,
  _visible: false,

  onLoad(options: any) {
    this.setData({ orderId: options.orderId || '' });
  },

  onShow() {
    this._visible = true;
    this.loadOrderDetail();
  },

  onHide() {
    this._visible = false;
    this.stopCountdown();
  },

  onUnload() {
    this.onHide();
  },

  async loadOrderDetail() {
    this.stopCountdown();
    this.setData({ loading: true, loadError: false, canPay: false });
    try {
      if (!this.data.orderId) throw new Error('缺少订单号');
      const order = await OrderService.getOrderDetail(this.data.orderId);
      if (!this._visible) return;
      this.setData({ order, loading: false });
      this.startCountdown();
    } catch (err) {
      if (!this._visible) return;
      this.setData({ order: null, loading: false, loadError: true });
    }
  },

  onRetry() {
    this.loadOrderDetail();
  },

  stopCountdown() {
    if (this._timer) clearInterval(this._timer);
    this._timer = null;
  },

  updateCountdown() {
    const order = this.data.order;
    const deadline = new Date(order?.booking.expiredAt || '').getTime();
    const pending = order?.orderStatus === 'PENDING_PAYMENT' && order.booking.status === 'PENDING_PAYMENT';
    const remainingSeconds = Number.isFinite(deadline) ? Math.max(0, Math.ceil((deadline - Date.now()) / 1000)) : 0;
    const canPay = !!pending && remainingSeconds > 0;
    const countdownText = `${String(Math.floor(remainingSeconds / 60)).padStart(2, '0')}:${String(remainingSeconds % 60).padStart(2, '0')}`;
    let paymentNotice = '';
    if (!pending) paymentNotice = order?.paymentStatus === 'PAID' ? '订单已支付' : '订单已关闭';
    else if (!Number.isFinite(deadline)) paymentNotice = '无法获取支付截止时间，请刷新订单';
    else if (!canPay) paymentNotice = '支付时间已过，请重新预约';
    this.setData({ remainingSeconds, countdownText, canPay, paymentNotice });
    if (!canPay) this.stopCountdown();
    return canPay;
  },

  startCountdown() {
    this.stopCountdown();
    if (this._visible && this.updateCountdown()) {
      this._timer = setInterval(() => this.updateCountdown(), 1000);
    }
  },

  async onConfirmPay() {
    if (this.data.paying || this.data.loading || !this.updateCountdown()) return;
    this.setData({ paying: true });
    try {
      await OrderService.payOrder(this.data.orderId);
      this.stopCountdown();
      this.setData({
        order: { ...this.data.order, orderStatus: 'PAID', paymentStatus: 'PAID' },
        canPay: false,
        paymentNotice: '订单已支付',
      });
      wx.redirectTo({
        url: `/pages/order/success/success?orderId=${encodeURIComponent(this.data.orderId)}`,
        fail: () => wx.showToast({ title: '已支付，请到订单查看凭证', icon: 'none' }),
      });
    } catch (err: any) {
      wx.showToast({ title: err.message || '支付失败，请重试', icon: 'none' });
      await this.loadOrderDetail();
    } finally {
      this.setData({ paying: false });
    }
  },

  goToOrders() {
    wx.switchTab({ url: '/pages/order/list/list' });
  },
});
