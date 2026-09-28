"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderService = void 0;
const request_1 = require("./request");
const booking_service_1 = require("./booking.service");
class OrderService {
    /**
     * 获取订单列表
     */
    static async getOrders(status) {
        // 接口的 REFUNDED 筛选只含退款；前端此分组还包括取消和超时订单。
        const list = await (0, request_1.request)('/orders', 'GET', {
            status: status === 'REFUNDED' ? undefined : status,
        });
        if (!Array.isArray(list))
            throw new Error('订单数据异常');
        return status === 'REFUNDED'
            ? list.filter((order) => ['REFUNDED', 'CANCELLED', 'EXPIRED'].includes(order.bookingStatus))
            : list;
    }
    /**
     * 获取订单详情
     */
    static async getOrderDetail(id) {
        const order = await (0, request_1.request)(`/orders/${encodeURIComponent(id)}`, 'GET');
        if (!order?.id || !order.booking?.venue)
            throw new Error('订单数据异常');
        return order;
    }
    /**
     * 取消订单
     */
    static async cancelOrder(id) {
        return booking_service_1.BookingService.cancelBooking(id);
    }
    /**
     * 模拟发起微信支付（失败必须显式抛错，禁止伪造支付成功）
     */
    static async payOrder(id, paymentMethod = 'WECHAT_PAY') {
        return (0, request_1.request)(`/orders/${id}/pay`, 'POST', { paymentMethod }, { showLoading: true, loadingTitle: '正在支付...' });
    }
}
exports.OrderService = OrderService;
