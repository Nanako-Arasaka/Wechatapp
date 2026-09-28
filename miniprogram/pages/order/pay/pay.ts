import { OrderService } from '../../../services/order.service';

Page({
  data: {
    orderId: '',
    order: null as any,
    countdownText: '14:59',
    paying: false,
    timer: null as any,
    remainingSeconds: 15 * 60,
  },

  onLoad(options: any) {
    if (options.orderId) {
      this.setData({ orderId: options.orderId });
      this.loadOrderDetail(options.orderId);
      this.startCountdown();
    }
  },

  onUnload() {
    if (this.data.timer) {
      clearInterval(this.data.timer);
    }
  },

  onHide() {
    if (this.data.timer) {
      clearInterval(this.data.timer);
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

  startCountdown() {
    const timer = setInterval(() => {
      let rem = this.data.remainingSeconds - 1;
      if (rem <= 0) {
        clearInterval(timer);
        this.setData({ countdownText: '00:00' });
        wx.showModal({
          title: '订单超时',
          content: '该订单已超时未支付，场地名额已被释放。',
          showCancel: false,
          success: () => {
            wx.switchTab({ url: '/pages/order/list/list' });
          },
        });
        return;
      }
      const m = String(Math.floor(rem / 60)).padStart(2, '0');
      const s = String(rem % 60).padStart(2, '0');
      this.setData({
        remainingSeconds: rem,
        countdownText: `${m}:${s}`,
      });
    }, 1000);

    this.setData({ timer });
  },

  async onConfirmPay() {
    this.setData({ paying: true });
    try {
      const res: any = await OrderService.payOrder(this.data.orderId);
      wx.showToast({ title: '支付成功！', icon: 'success' });

      setTimeout(() => {
        wx.redirectTo({
          url: `/pages/order/success/success?orderId=${this.data.orderId}&bookingCode=${res.bookingCode}&bookingNo=${res.bookingNo}`,
        });
      }, 600);
    } catch (err) {
      // 错误由 request 拦截器处理
    } finally {
      this.setData({ paying: false });
    }
  },
});
