import { OrderService } from '../../../services/order.service';
import { BookingService } from '../../../services/booking.service';
import { OrderDetail } from '../../../types';
import { getStatusMeta } from '../../../utils/format';

Page({
  data: {
    id: '',
    order: null as OrderDetail | null,
    loading: true,
    loadError: false,
    cancelling: false,
    statusText: '',
  },

  onLoad(options: any) {
    this.setData({ id: options.id || '' });
  },

  onShow() {
    this.loadOrderDetail();
  },

  onPullDownRefresh() {
    this.loadOrderDetail().finally(() => wx.stopPullDownRefresh());
  },

  onRetry() {
    this.loadOrderDetail();
  },

  async loadOrderDetail() {
    this.setData({ loading: true, loadError: false });
    try {
      if (!this.data.id) throw new Error('缺少订单号');
      const order = await OrderService.getOrderDetail(this.data.id);
      this.setData({ order, statusText: getStatusMeta(order.booking.status).label });
    } catch (err) {
      this.setData({ order: null, loadError: true });
    } finally {
      this.setData({ loading: false });
    }
  },

  goToVenue(e: any) {
    const venueId = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/venue/detail/detail?id=${venueId}` });
  },

  goToQR() {
    const o = this.data.order;
    if (!o || o.booking.status !== 'CONFIRMED') return;
    wx.navigateTo({
      url: `/pages/order/success/success?orderId=${encodeURIComponent(o.id)}`,
    });
  },

  goToPay() {
    if (!this.data.order) return;
    wx.navigateTo({ url: `/pages/order/pay/pay?orderId=${encodeURIComponent(this.data.order.id)}` });
  },

  onCancelBooking() {
    const o = this.data.order;
    if (!o || this.data.cancelling) return;
    const confirmed = o.booking.status === 'CONFIRMED';
    if (!confirmed && o.booking.status !== 'PENDING_PAYMENT') return;
    wx.showModal({
      title: '确认取消预约？',
      content: confirmed ? `确认后将退回 ¥${(o.paidAmount / 100).toFixed(2)} 并释放场地名额。` : '取消后将释放场地名额。',
      confirmColor: '#FF4D4F',
      success: async (res) => {
        if (res.confirm && !this.data.cancelling) {
          this.setData({ cancelling: true });
          try {
            await BookingService.cancelBooking(o.booking.id);
            wx.showToast({ title: '预约已取消', icon: 'success' });
            await this.loadOrderDetail();
          } catch (err: any) {
            wx.showToast({ title: err.message || '取消失败，请重试', icon: 'none' });
          } finally {
            this.setData({ cancelling: false });
          }
        }
      },
    });
  },
});
