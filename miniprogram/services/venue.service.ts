import { request } from './request';
import { Venue, AvailabilityData, VenueSlot } from '../types';
import { MOCK_VENUES } from './mock.data';
import { CONFIG } from '../config';

export class VenueService {
  /**
   * 查询场馆列表 (双重保障：HTTP API -> 本地自愈数据集)
   */
  static async getVenues(params?: {
    keyword?: string;
    type?: string;
    date?: string;
    sortBy?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ list: Venue[]; total: number; page: number; pageSize: number }> {
    try {
      const res = await request<any>('/venues', 'GET', params, { showErrorToast: false });
      if (Array.isArray(res)) {
        return { list: res, total: res.length, page: params?.page || 1, pageSize: params?.pageSize || res.length };
      }
      if (res && Array.isArray(res.list)) {
        return {
          list: res.list,
          total: Number(res.total) || res.list.length,
          page: Number(res.page) || params?.page || 1,
          pageSize: Number(res.pageSize) || params?.pageSize || res.list.length,
        };
      }
      return { list: [], total: 0, page: 1, pageSize: params?.pageSize || 20 };
    } catch (httpErr: any) {
      if (!CONFIG.ENABLE_OFFLINE_DEMO) throw httpErr;
      VenueService.showDemoToast();
      let venues = [...MOCK_VENUES];
      if (params?.type) {
        venues = venues.filter((v) => v.type === params.type);
      }
      if (params?.keyword) {
        const kw = params.keyword.toLowerCase();
        venues = venues.filter((v) => v.name.toLowerCase().includes(kw) || (v.description || '').toLowerCase().includes(kw));
      }
      return { list: venues, total: venues.length, page: 1, pageSize: venues.length };
    }
  }

  /**
   * 查询场馆详情
   */
  static async getVenueDetail(id: string): Promise<Venue> {
    try {
      return await request<Venue>(`/venues/${id}`, 'GET', undefined, { showErrorToast: false });
    } catch (httpErr: any) {
      if (!CONFIG.ENABLE_OFFLINE_DEMO) throw httpErr;
      VenueService.showDemoToast();
      const found = MOCK_VENUES.find((v) => v.id === id) || MOCK_VENUES[0];
      return found;
    }
  }

  /**
   * 查询指定日期实时时段余量 (核心余量引擎)
   */
  static async getAvailability(id: string, date?: string): Promise<AvailabilityData> {
    try {
      const params = (date && date !== 'undefined') ? { date } : undefined;
      return await request<AvailabilityData>(`/venues/${id}/availability`, 'GET', params, { showErrorToast: false });
    } catch (httpErr: any) {
      if (!CONFIG.ENABLE_OFFLINE_DEMO) throw httpErr;
      VenueService.showDemoToast();
      const today = date || new Date().toISOString().slice(0, 10);
      const defaultSlots: VenueSlot[] = [
        { id: '1', venueId: id, date: today, timeRange: '09:00-10:00', startTime: '09:00', endTime: '10:00', price: 3500, status: 'AVAILABLE', statusText: '可预约', statusColor: 'green', isSelectable: true, bookedCapacity: 0, totalCapacity: 1, remaining: 1 },
        { id: '2', venueId: id, date: today, timeRange: '10:00-11:00', startTime: '10:00', endTime: '11:00', price: 3500, status: 'AVAILABLE', statusText: '可预约', statusColor: 'green', isSelectable: true, bookedCapacity: 0, totalCapacity: 1, remaining: 1 },
        { id: '3', venueId: id, date: today, timeRange: '14:00-15:00', startTime: '14:00', endTime: '15:00', price: 3500, status: 'AVAILABLE', statusText: '可预约', statusColor: 'green', isSelectable: true, bookedCapacity: 0, totalCapacity: 1, remaining: 1 },
        { id: '4', venueId: id, date: today, timeRange: '15:00-16:00', startTime: '15:00', endTime: '16:00', price: 3500, status: 'AVAILABLE', statusText: '可预约', statusColor: 'green', isSelectable: true, bookedCapacity: 0, totalCapacity: 1, remaining: 1 },
        { id: '5', venueId: id, date: today, timeRange: '18:00-19:00', startTime: '18:00', endTime: '19:00', price: 4000, status: 'TIGHT', statusText: '余量紧张', statusColor: 'orange', isSelectable: true, bookedCapacity: 1, totalCapacity: 2, remaining: 1 },
        { id: '6', venueId: id, date: today, timeRange: '19:00-20:00', startTime: '19:00', endTime: '20:00', price: 4000, status: 'FULL', statusText: '已满', statusColor: 'red', isSelectable: false, bookedCapacity: 2, totalCapacity: 2, remaining: 0 },
        { id: '7', venueId: id, date: today, timeRange: '20:00-21:00', startTime: '20:00', endTime: '21:00', price: 3500, status: 'AVAILABLE', statusText: '可预约', statusColor: 'green', isSelectable: true, bookedCapacity: 0, totalCapacity: 1, remaining: 1 },
      ];
      return {
        venueId: id,
        venueName: '星羽羽毛球馆',
        basePrice: 3500,
        date: today,
        isClosed: false,
        slots: defaultSlots,
        peakAdvice: '今日18:00-20:00为晚高峰时段余量紧张，建议选择下午14:00-17:00错峰运动！',
      };
    }
  }

  /**
   * 查询指定时段的场地占用情况（选场地页真实数据源）
   */
  static async getSlotCourts(venueId: string, slotId: string): Promise<{ totalCapacity: number; occupied: number[] }> {
    return request(`/venues/${venueId}/slots/${slotId}/courts`, 'GET', undefined, { showErrorToast: false });
  }

  private static shownDemoToast = false;

  private static showDemoToast() {
    if (VenueService.shownDemoToast) return;
    VenueService.shownDemoToast = true;
    wx.showToast({ title: '当前为离线演示模式', icon: 'none', duration: 2500 });
  }
}
