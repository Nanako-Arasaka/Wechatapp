import { OrderService } from '../../../services/order.service';
import { QRCodeGenerator } from '../../../utils/qrcode';

Page({
  data: {
    orderId: '',
    bookingCode: '',
    order: null as any,
  },

  onLoad(options: any) {
    if (options.orderId) {
      this.setData({
        orderId: options.orderId,
        bookingCode: options.bookingCode || 'SV202609010001',
      });
      this.loadOrderDetail(options.orderId);
    }
  },

  async loadOrderDetail(id: string) {
    try {
      const order = await OrderService.getOrderDetail(id);
      const bCode = order.bookingCode || (order as any).booking?.bookingCode || this.data.bookingCode;
      const bNo = (order as any).booking?.bookingNo || order.orderNo || `BK${id.slice(-6)}`;

      this.setData({
        order,
        bookingCode: bCode,
      });

      // 绘制二维码
      const qrPayload = JSON.stringify({
        type: 'BOOKING_CHECKIN',
        bookingNo: bNo,
        bookingCode: bCode,
      });

      setTimeout(() => {
        QRCodeGenerator.draw('qrcodeCanvas', qrPayload, 160, 160, this);
      }, 200);
    } catch (err) {
      console.error('加载凭证详情失败:', err);
    }
  },

  goToOrders() {
    wx.switchTab({ url: '/pages/order/list/list' });
  },

  goToHome() {
    wx.switchTab({ url: '/pages/index/index' });
  },
});
