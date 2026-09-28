import { OrderService } from '../../../services/order.service';
import { BookingService } from '../../../services/booking.service';

Page({
  data: {
    id: '',
    order: null as any,
  },

  onLoad(options: any) {
    if (options.id) {
      this.setData({ id: options.id });
      this.loadOrderDetail(options.id);
    }
  },

  async loadOrderDetail(id: string) {
    try {
      const order = await OrderService.getOrderDetail(id);
      this.setData({ order });
    } catch (err) {
      console.error('加载订单详情失败:', err);
    }
  },

  goToVenue(e: any) {
    const venueId = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/venue/detail/detail?id=${venueId}` });
  },

  goToQR() {
    const o = this.data.order;
    wx.navigateTo({
      url: `/pages/order/success/success?orderId=${o.id}&bookingCode=${o.booking.bookingCode}`,
    });
  },

  onCancelBooking() {
    const o = this.data.order;
    wx.showModal({
      title: '确认取消预约？',
      content: '确认后将全额退款 ¥' + (o.paidAmount / 100) + ' 并释放场地名额。',
      confirmColor: '#FF4D4F',
      success: async (res) => {
        if (res.confirm) {
          try {
            await BookingService.cancelBooking(o.booking.id);
            wx.showToast({ title: '已取消并全额退款', icon: 'success' });
            this.loadOrderDetail(this.data.id);
          } catch (err) {
            // 异常已处理
          }
        }
      },
    });
  },
});
