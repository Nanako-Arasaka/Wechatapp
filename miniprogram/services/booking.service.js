"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingService = void 0;
const request_1 = require("./request");
class BookingService {
    /**
     * 创建预约 (HTTP 接口)
     */
    static async createBooking(params) {
        return await (0, request_1.request)('/bookings', 'POST', params, { showLoading: true, loadingTitle: '正在锁定场地...', showErrorToast: false });
    }
    /**
     * 查询预约详情
     */
    static async getBookingDetail(id) {
        return (0, request_1.request)(`/bookings/${id}`, 'GET');
    }
    /**
     * 取消预约 (HTTP 接口)
     */
    static async cancelBooking(id) {
        return await (0, request_1.request)(`/bookings/${id}/cancel`, 'POST', {}, { showLoading: true, loadingTitle: '正在处理取消...', showErrorToast: false });
    }
}
exports.BookingService = BookingService;
