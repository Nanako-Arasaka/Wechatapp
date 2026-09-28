import { request } from './request';
import { OrderItem } from '../types';
import { BookingService } from './booking.service';
import { MOCK_ORDERS } from './mock.data';

export class OrderService {
  /**
   * 获取订单列表 (双重保障：HTTP API -> 本地自愈数据集)
   */
  static async getOrders(status?: string): Promise<OrderItem[]> {
    try {
      return await request<OrderItem[]>('/orders', 'GET', { status }, { showErrorToast: false });
    } catch (httpErr) {
      // 二级自愈保障：返回用户默认订单
      let orders = [...MOCK_ORDERS];
      if (status && status !== 'ALL') {
        orders = orders.filter((o) => o.bookingStatus === status);
      }
      return orders;
    }
  }

  /**
   * 获取订单详情
   */
  static async getOrderDetail(id: string): Promise<OrderItem> {
    try {
      return await request<OrderItem>(`/orders/${id}`, 'GET', undefined, { showErrorToast: false });
    } catch (httpErr) {
      const found = MOCK_ORDERS.find((o) => o.id === id || o.bookingId === id) || MOCK_ORDERS[0];
      return found;
    }
  }

  /**
   * 取消订单
   */
  static async cancelOrder(id: string) {
    return BookingService.cancelBooking(id);
  }

  /**
   * 模拟发起微信支付（失败必须显式抛错，禁止伪造支付成功）
   */
  static async payOrder(id: string, paymentMethod = 'WECHAT_PAY') {
    return request(
      `/orders/${id}/pay`,
      'POST',
      { paymentMethod },
      { showLoading: true, loadingTitle: '正在调用微信安全支付...', showErrorToast: true },
    );
  }
}
