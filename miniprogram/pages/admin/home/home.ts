import { AdminService } from '../../../services/admin.service';
import { AuthStore } from '../../../store/auth';
import { guardAdminPage } from '../../../utils/admin-guard';
import { venueImage } from '../../../utils/venue-image';
import { getVenueTypeName } from '../../../utils/format';
import { Venue } from '../../../types';

/**
 * 管理端落地页（AdminHomePage）
 * ----------------------------------------------------------------------------
 * 管理员打开小程序后的第一屏。与用户端首页（pages/index）完全分离：
 * 这里以「我负责的场馆」为主体，点击某个场馆进入该场馆的管理详情。
 *
 * 角色区分：
 * - ADMIN：只做单场馆运营（排期、核销、预约监管）
 * - SUPER_ADMIN：额外提供全馆运营分析入口（dashboard）
 *
 * 场馆列表数据源说明：
 * 后端尚未提供「我的场馆」接口，当前复用 GET /admin/venues。
 * 待后端就绪后，只需把 loadVenues 换成 AdminService.getMyVenues()，
 * 页面其余部分无需改动。
 */
Page({
  data: {
    adminName: '管理员',
    isSuperAdmin: false,
    loading: false,
    loadError: false,
    venues: [] as Venue[],
    /** 今日概览（按场馆聚合，取后端已返回的字段，缺失则不展示） */
    todayStats: [] as Array<{
      id: string;
      name: string;
      bookingCount: number;
      incomeText: string;
    }>,
  },
  _loadId: 0,

  onShow() {
    if (!guardAdminPage()) return;
    const user = AuthStore.getUser();
    this.setData({
      adminName: user?.nickname || '管理员',
      isSuperAdmin: AuthStore.isSuperAdmin(),
    });
    this.loadVenues();
  },

  onPullDownRefresh() {
    this.loadVenues().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  async loadVenues() {
    const loadId = ++this._loadId;
    this.setData({ loading: true, loadError: false });
    try {
      const res: any = await AdminService.getVenues(1, 20);
      const list: Venue[] = (res?.list || []).map((venue: Venue) => ({
        ...venue,
        coverImage: venueImage(venue.coverImage),
      }));

      if (loadId !== this._loadId) return;
      this.setData({
        loading: false,
        venues: list,
        todayStats: this.buildTodayStats(list),
      });
    } catch (err) {
      if (loadId !== this._loadId) return;
      console.error('加载管理端场馆失败:', err);
      this.setData({ loading: false, loadError: true, venues: [] });
    }
  },

  /**
   * 汇总今日概览。只使用接口已返回的字段，缺失时置 0 并保持展示稳定，
   * 避免因后端字段未就绪导致整块区域塌陷。
   */
  buildTodayStats(venues: Venue[]) {
    return venues.map((venue) => ({
      id: venue.id,
      name: venue.name,
      bookingCount: Number(venue.totalBookings) || 0,
      incomeText: venue.totalRemaining ? `余 ${venue.totalRemaining}` : '—',
    }));
  },

  onRetry() {
    this.loadVenues();
  },

  /** 点击场馆卡片：进入该场馆的管理详情页 */
  goVenueDetail(e: any) {
    const id = e.currentTarget.dataset.id;
    const name = e.currentTarget.dataset.name || '';
    if (!id) return;
    wx.navigateTo({
      url: `/pages/admin/venue-detail/venue-detail?venueId=${encodeURIComponent(id)}&venueName=${encodeURIComponent(name)}`,
    });
  },

  onImageError(e: any) {
    e.currentTarget.dataset.img = '/assets/ui/venue.svg';
  },

  /** 快捷入口 */
  goScan() {
    wx.navigateTo({ url: '/pages/admin/checkin/checkin' });
  },

  goSchedule(e: any) {
    const id = e.currentTarget.dataset.venueId;
    const name = e.currentTarget.dataset.venueName || '';
    if (!id) {
      wx.showToast({ title: '请先选择场馆', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: `/pages/admin/venue-schedule/venue-schedule?venueId=${encodeURIComponent(id)}&venueName=${encodeURIComponent(name)}`,
    });
  },

  goBookings() {
    wx.navigateTo({ url: '/pages/admin/bookings/bookings' });
  },

  goSettlement() {
    wx.navigateTo({ url: '/pages/admin/settlement/settlement' });
  },

  goDashboard() {
    wx.navigateTo({ url: '/pages/admin/dashboard/dashboard' });
  },

  /** 切回用户端浏览场馆 */
  goUserSide() {
    wx.switchTab({ url: '/pages/venue/list/list' });
  },

  venueTypeName(type: string) {
    return getVenueTypeName(type);
  },
});
