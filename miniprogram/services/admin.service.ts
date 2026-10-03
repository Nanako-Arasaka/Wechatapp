import { request } from './request';
import { DashboardData } from '../types';

export class AdminService {
  /**
   * 运营 Dashboard 数据
   */
  static async getDashboardOverview(): Promise<DashboardData> {
    return request<DashboardData>('/admin/dashboard', 'GET');
  }

  /**
   * 实时场馆监控状态
   */
  static async getRealtimeStatus() {
    return request('/admin/dashboard/realtime', 'GET');
  }

  /**
   * 预约热力矩阵
   */
  static async getHeatmap() {
    return request('/admin/dashboard/heatmap', 'GET');
  }

  /**
   * 创建账号（管理员后台开通）
   */
  static async createUser(data: { username: string; password: string; nickname?: string; phone?: string; role?: string }) {
    return request('/admin/users', 'POST', data, { showLoading: true, loadingTitle: '正在创建账号...', showErrorToast: true });
  }

  /**
   * 查询用户列表（支持按角色筛选）
   */
  static async getUsers(role?: string, page: number = 1, pageSize: number = 50) {
    return request('/admin/users', 'GET', { role, page, pageSize });
  }

  /**
   * 删除用户账号
   */
  static async deleteUser(id: string) {
    return request(`/admin/users/${id}`, 'DELETE', {}, { showLoading: true, loadingTitle: '正在删除...', showErrorToast: true });
  }

  /**
   * 场馆管理列表
   */
  static async getVenues(page: number = 1, pageSize: number = 20, keyword?: string) {
    return request('/admin/venues', 'GET', { page, pageSize, keyword });
  }

  /**
   * 新增场馆
   */
  static async createVenue(data: any) {
    return request('/admin/venues', 'POST', data, { showLoading: true, loadingTitle: '正在保存场馆...' });
  }

  /**
   * 编辑场馆
   */
  static async updateVenue(id: string, data: any) {
    return request(`/admin/venues/${id}`, 'PUT', data, { showLoading: true, loadingTitle: '正在更新...' });
  }

  /**
   * 预览营业时间变更
   */
  static async previewTimeChange(id: string, openTime: string, closeTime: string) {
    return request(`/admin/venues/${id}/preview-time-change`, 'POST', { openTime, closeTime }, { showLoading: true, loadingTitle: '正在生成变更预览...' });
  }

  /**
   * 删除场馆
   */
  static async deleteVenue(id: string) {
    return request(`/admin/venues/${id}`, 'DELETE', {}, { showLoading: true, loadingTitle: '正在下架场馆...' });
  }

  /**
   * 批量调整所有场馆营业时间
   */
  static async batchUpdateTime(openTime: string, closeTime: string) {
    return request('/admin/venues/batch-time', 'POST', { openTime, closeTime }, { showLoading: true, loadingTitle: '正在批量调整...' });
  }

  /**
   * 设置临时闭馆（支持日期区间）
   */
  static async setClosedDate(venueId: string, startDate: string, endDate: string, reason: string) {
    return request(`/admin/venues/${venueId}/close-date`, 'POST', { startDate, endDate, reason }, { showLoading: true, loadingTitle: '正在设置临时闭馆...' });
  }

  /**
   * 直接开馆：清除未来临时闭馆并恢复上架状态
   */
  static async reopenVenue(venueId: string) {
    return request(`/admin/venues/${venueId}/reopen`, 'POST', {}, { showLoading: true, loadingTitle: '正在恢复开馆...' });
  }

  /**
   * 预约管理列表
   */
  static async getBookings(params: any) {
    return request('/admin/bookings', 'GET', params);
  }

  /**
   * 扫码预检
   */
  static async verifyCheckin(code: string) {
    return request(
      '/admin/checkin/verify',
      'POST',
      { code },
      { showLoading: true, loadingTitle: '正在核验...', showErrorToast: true },
    );
  }

  /**
   * 确认核销
   */
  static async confirmCheckin(bookingId: string) {
    return request(
      '/admin/checkin/confirm',
      'POST',
      { bookingId },
      { showLoading: true, loadingTitle: '正在核销...', showErrorToast: true },
    );
  }

  /**
   * 压力测试与数据调度：注入高峰客流
   */
  static async devGeneratePeak() {
    return request('/dev/generate-peak', 'POST', {}, { showLoading: true, loadingTitle: '正在注入客流...', showErrorToast: true });
  }

  /**
   * 订单超时扫描与库存自动释放调度
   */
  static async devExpireOrders() {
    return request('/dev/expire-orders', 'POST', {}, { showLoading: true, loadingTitle: '正在扫描超时订单...', showErrorToast: true });
  }

  /**
   * 开关单个时段的使用权（管理端自主开关，非「管理员专属预约」）
   * @param slotId 时段 ID
   * @param action open=开放预约 / block=封锁（仅管理员内部使用）/ close=关闭
   * @param reason 占用原因，block 时必填
   *
   * 后端待提供（见 docs/backend-requests.md A5）：
   *   PATCH /admin/slots/:id  body: { action, reason }
   */
  static async setSlotAvailability(
    slotId: string,
    action: 'open' | 'block' | 'close',
    reason = '',
  ) {
    return request(
      `/admin/slots/${slotId}`,
      'PATCH',
      { action, reason: reason || undefined },
      { showLoading: false, showErrorToast: true },
    );
  }

  /**
   * 批量开关未来若干天的同一时段
   * @param payload venueId / dates / action / reason / startTime
   *
   * 后端待提供（见 docs/backend-requests.md A5）：
   *   POST /admin/slots/batch  body: { venueId, dates, startTime, action, reason }
   */
  static async batchSetSlotAvailability(payload: {
    venueId: string;
    dates: string[];
    startTime?: string;
    action: 'open' | 'block' | 'close';
    reason?: string;
  }) {
    return request(
      '/admin/slots/batch',
      'POST',
      payload,
      { showLoading: false, showErrorToast: true },
    );
  }
}
