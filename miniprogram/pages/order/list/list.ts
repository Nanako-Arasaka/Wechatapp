import { OrderService } from '../../../services/order.service';
import { OrderItem } from '../../../types';
import { AuthStore } from '../../../store/auth';

Page({
  data: {
    loading: false,
    loadError: false,
    cancelling: false,
    isLoggedIn: false,
    currentStatus: 'ALL',
    orderList: [] as OrderItem[],
    statusTabs: [
      { key: 'ALL', name: '全部' },
      { key: 'PENDING_PAYMENT', name: '待支付' },
      { key: 'CONFIRMED', name: '待使用' },
      { key: 'COMPLETED', name: '已完成' },
      { key: 'REFUNDED', name: '退款/取消' },
    ],
  },
  _loadId: 0,

  onShow() {
    const isLoggedIn = !!AuthStore.getToken();
    this.setData({ isLoggedIn });
    if (!isLoggedIn) {
      this._loadId++;
      this.setData({ orderList: [], loading: false, loadError: false });
      return;
    }
    const app = getApp<any>();
    if (app && app.globalData && app.globalData.targetOrderStatus) {
      const target = app.globalData.targetOrderStatus;
      app.globalData.targetOrderStatus = null;
      const mapped = (target === 'CANCELLED' || target === 'REFUNDED') ? 'REFUNDED' : target;
      this.setData({ currentStatus: mapped });
    }
    this.loadOrders();
  },

  onPullDownRefresh() {
    this.loadOrders().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  async loadOrders() {
    if (!AuthStore.getToken()) return;
    const loadId = ++this._loadId;
    const status = this.data.currentStatus;
    this.setData({ loading: true, loadError: false });
    try {
      const list = await OrderService.getOrders(
        status !== 'ALL' ? status : undefined,
      );
      if (loadId !== this._loadId) return;
      this.setData({ orderList: list || [], loading: false });
    } catch (err) {
      if (loadId !== this._loadId) return;
      console.warn('订单列表加载失败:', err);
      this.setData({ loading: false, loadError: true, orderList: [] });
    }
  },

  onRetry() {
    this.loadOrders();
  },

  onTabChange(e: any) {
    const key = e.currentTarget.dataset.key;
    this.setData({ currentStatus: key });
    this.loadOrders();
  },

  goToDetail(e: any) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/order/detail/detail?id=${id}` });
  },

  goToPay(e: any) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/order/pay/pay?orderId=${id}` });
  },

  goToQRCode(e: any) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/order/success/success?orderId=${encodeURIComponent(id)}`,
    });
  },

  /**
   * 取消退订已确认的预约（API 优先：接口成功后再更新视图，loading 防连点）
   */
  async onCancelBooking(e: any) {
    if (this.data.cancelling) return;
    const bookingId = e.currentTarget.dataset.bookingId || e.currentTarget.dataset.id;
    const order = this.data.orderList.find((o) => o.bookingId === bookingId || o.id === bookingId);
    const refundText = order ? ` ¥${((order.amount || 0) / 100).toFixed(2)}` : '';
    wx.showModal({
      title: '确认取消退订',
      content: `退订将全额原路退款${refundText}并立即释放场地名额，是否确认取消？`,
      confirmColor: '#FF4D4F',
      confirmText: '确认退订',
      cancelText: '再想想',
      success: async (res) => {
        if (!res.confirm || this.data.cancelling) return;
        this.setData({ cancelling: true });
        wx.showLoading({ title: '正在退订...', mask: true });
        try {
          await OrderService.cancelOrder(bookingId);
          wx.hideLoading();
          wx.showToast({ title: '退订成功，已全额退款', icon: 'success', duration: 2000 });
          // 以服务端结果为准，重新拉取列表
          await this.loadOrders();
        } catch (err: any) {
          wx.hideLoading();
          wx.showToast({ title: err?.message || '退订失败，请稍后重试', icon: 'none', duration: 2500 });
        } finally {
          this.setData({ cancelling: false });
        }
      },
    });
  },

  /**
   * 取消待支付订单（API 优先 + loading 防连点）
   */
  async onCancelOrder(e: any) {
    if (this.data.cancelling) return;
    const id = e.currentTarget.dataset.id;
    const order = this.data.orderList.find((o) => o.id === id);
    if (!order) return;
    wx.showModal({
      title: '确认取消订单',
      content: '是否确认取消该待支付订单？',
      confirmColor: '#FF4D4F',
      success: async (res) => {
        if (!res.confirm || this.data.cancelling) return;
        this.setData({ cancelling: true });
        wx.showLoading({ title: '正在取消...', mask: true });
        try {
          await OrderService.cancelOrder(order.bookingId);
          wx.hideLoading();
          wx.showToast({ title: '订单已取消', icon: 'success' });
          await this.loadOrders();
        } catch (err: any) {
          wx.hideLoading();
          wx.showToast({ title: err?.message || '取消失败，请稍后重试', icon: 'none', duration: 2500 });
        } finally {
          this.setData({ cancelling: false });
        }
      },
    });
  },

  /**
   * 再次预约
   */
  onRebook(e: any) {
    const venueId = e.currentTarget.dataset.venueId;
    if (!venueId) return;
    wx.navigateTo({ url: `/pages/venue/booking/booking?id=${venueId}` });
  },

  goToVenues() {
    wx.switchTab({ url: '/pages/venue/list/list' });
  },

  goToLogin() {
    wx.navigateTo({ url: '/pages/auth/login/login' });
  },

  noBubble() {},
});
