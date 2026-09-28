import { request } from './request';

export interface CreateBookingParams {
  venueId: string;
  slotId: string;
  quantity: number;
  contactName: string;
  contactPhone: string;
  studentNo: string;
  courtNo?: number; // 选场地流程时传入，后端做同时段同场地互斥
  date?: string;
  timeSlot?: string;
}

export class BookingService {
  /**
   * 创建预约 (HTTP 接口)
   */
  static async createBooking(params: CreateBookingParams) {
    return await request(
      '/bookings',
      'POST',
      params,
      { showLoading: true, loadingTitle: '正在锁定场地...', showErrorToast: false },
    );
  }

  /**
   * 查询预约详情
   */
  static async getBookingDetail(id: string) {
    return request(`/bookings/${id}`, 'GET');
  }

  /**
   * 取消预约 (HTTP 接口)
   */
  static async cancelBooking(id: string) {
    return await request(
      `/bookings/${id}/cancel`,
      'POST',
      {},
      { showLoading: true, loadingTitle: '正在处理取消...', showErrorToast: false },
    );
  }
}
