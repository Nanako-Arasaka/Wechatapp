"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const request_1 = require("./request");
class AdminService {
    /**
     * 运营 Dashboard 数据
     */
    static async getDashboardOverview() {
        return (0, request_1.request)('/admin/dashboard', 'GET');
    }
    /**
     * 实时场馆监控状态
     */
    static async getRealtimeStatus() {
        return (0, request_1.request)('/admin/dashboard/realtime', 'GET');
    }
    /**
     * 预约热力矩阵
     */
    static async getHeatmap() {
        return (0, request_1.request)('/admin/dashboard/heatmap', 'GET');
    }
    /**
     * 创建账号（管理员后台开通）
     */
    static async createUser(data) {
        return (0, request_1.request)('/admin/users', 'POST', data, { showLoading: true, loadingTitle: '正在创建账号...' });
    }
    /**
     * 查询用户列表（支持按角色筛选）
     */
    static async getUsers(role, page = 1, pageSize = 50) {
        return (0, request_1.request)('/admin/users', 'GET', { role, page, pageSize });
    }
    /**
     * 删除用户账号
     */
    static async deleteUser(id) {
        return (0, request_1.request)(`/admin/users/${id}`, 'DELETE', {}, { showLoading: true, loadingTitle: '正在删除...' });
    }
    /**
     * 场馆管理列表
     */
    static async getVenues(page = 1, pageSize = 20, keyword) {
        return (0, request_1.request)('/admin/venues', 'GET', { page, pageSize, keyword });
    }
    /**
     * 新增场馆
     */
    static async createVenue(data) {
        return (0, request_1.request)('/admin/venues', 'POST', data, { showLoading: true, loadingTitle: '正在保存场馆...' });
    }
    /**
     * 编辑场馆
     */
    static async updateVenue(id, data) {
        return (0, request_1.request)(`/admin/venues/${id}`, 'PUT', data, { showLoading: true, loadingTitle: '正在更新...' });
    }
    /**
     * 预览营业时间变更
     */
    static async previewTimeChange(id, openTime, closeTime) {
        return (0, request_1.request)(`/admin/venues/${id}/preview-time-change`, 'POST', { openTime, closeTime }, { showLoading: true, loadingTitle: '正在生成变更预览...' });
    }
    /**
     * 删除场馆
     */
    static async deleteVenue(id) {
        return (0, request_1.request)(`/admin/venues/${id}`, 'DELETE', {}, { showLoading: true, loadingTitle: '正在下架场馆...' });
    }
    /**
     * 批量调整所有场馆营业时间
     */
    static async batchUpdateTime(openTime, closeTime) {
        return (0, request_1.request)('/admin/venues/batch-time', 'POST', { openTime, closeTime }, { showLoading: true, loadingTitle: '正在批量调整...' });
    }
    /**
     * 设置临时闭馆（支持日期区间）
     */
    static async setClosedDate(venueId, startDate, endDate, reason) {
        return (0, request_1.request)(`/admin/venues/${venueId}/close-date`, 'POST', { startDate, endDate, reason }, { showLoading: true, loadingTitle: '正在设置临时闭馆...' });
    }
    /**
     * 直接开馆：清除未来临时闭馆并恢复上架状态
     */
    static async reopenVenue(venueId) {
        return (0, request_1.request)(`/admin/venues/${venueId}/reopen`, 'POST', {}, { showLoading: true, loadingTitle: '正在恢复开馆...' });
    }
    /**
     * 预约管理列表
     */
    static async getBookings(params) {
        return (0, request_1.request)('/admin/bookings', 'GET', params);
    }
    /**
     * 扫码预检
     */
    static async verifyCheckin(code) {
        return (0, request_1.request)('/admin/checkin/verify', 'POST', { code }, { showLoading: true, loadingTitle: '正在解析二维码...' });
    }
    /**
     * 确认核销
     */
    static async confirmCheckin(bookingId) {
        return (0, request_1.request)('/admin/checkin/confirm', 'POST', { bookingId }, { showLoading: true, loadingTitle: '正在执行核销...' });
    }
    /**
     * 压力测试与数据调度：注入高峰客流
     */
    static async devGeneratePeak() {
        return (0, request_1.request)('/dev/generate-peak', 'POST', {}, { showLoading: true, loadingTitle: '正在注入客流...' });
    }
    /**
     * 订单超时扫描与库存自动释放调度
     */
    static async devExpireOrders() {
        return (0, request_1.request)('/dev/expire-orders', 'POST', {}, { showLoading: true, loadingTitle: '正在扫描超时订单...' });
    }
}
exports.AdminService = AdminService;
