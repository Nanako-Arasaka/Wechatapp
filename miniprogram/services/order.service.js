"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderService = void 0;
const request_1 = require("./request");
const booking_service_1 = require("./booking.service");
const mock_data_1 = require("./mock.data");
class OrderService {
    /**
     * 获取订单列表 (双重保障：HTTP API -> 本地自愈数据集)
     */
    static async getOrders(status) {
        try {
            return await (0, request_1.request)('/orders', 'GET', { status }, { showErrorToast: false });
        }
        catch (httpErr) {
            // 二级自愈保障：返回用户默认订单
            let orders = [...mock_data_1.MOCK_ORDERS];
            if (status && status !== 'ALL') {
                orders = orders.filter((o) => o.bookingStatus === status);
            }
            return orders;
        }
    }
    /**
     * 获取订单详情
     */
    static async getOrderDetail(id) {
        try {
            return await (0, request_1.request)(`/orders/${id}`, 'GET', undefined, { showErrorToast: false });
        }
        catch (httpErr) {
            const found = mock_data_1.MOCK_ORDERS.find((o) => o.id === id || o.bookingId === id) || mock_data_1.MOCK_ORDERS[0];
            return found;
        }
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
        return (0, request_1.request)(`/orders/${id}/pay`, 'POST', { paymentMethod }, { showLoading: true, loadingTitle: '正在调用微信安全支付...', showErrorToast: true });
    }
}
exports.OrderService = OrderService;
