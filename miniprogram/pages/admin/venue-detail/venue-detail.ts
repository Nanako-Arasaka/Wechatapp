import { AdminService } from '../../../services/admin.service';
import { guardAdminPage } from '../../../utils/admin-guard';
import { venueImage } from '../../../utils/venue-image';
import { getVenueTypeName, formatMoney } from '../../../utils/format';
import { Venue } from '../../../types';

/**
 * 单场馆管理详情页（AdminVenueDetailPage）
 * ----------------------------------------------------------------------------
 * 从管理端首页的某个场馆进入，只管理这一个场馆。把原先 admin/venues
 * 全馆列表页里与单个场馆绑定的能力收拢到这里，符合「一个管理员只负责
 * 一到两个场馆」的实际场景。
 *
 * 覆盖能力（全部作用于当前场馆）：
 * - 场馆资料查看 / 编辑
 * - 营业时间调整（含变更预览）
 * - 临时闭馆（支持日期区间）
 * - 直接开馆
 * - 上架 / 下架
 * - 跳转到该场馆的排期与预约监管
 *
 * 全馆级别的批量操作（批量改营业时间、新增场馆）仍保留在 admin/venues。
 */
Page({
  data: {
    venueId: '',
    venueName: '',
    venue: null as Venue | null,
    coverImage: '',
    loading: true,
    loadError: false,
    submitting: false,
    /** 未来闭馆区间 */
    closedRanges: [] as Array<{ startDate: string; endDate: string; reason: string }>,
  },
  _loadId: 0,

  onLoad(options: any) {
    const venueId = options.venueId || '';
    const venueName = options.venueName ? decodeURIComponent(options.venueName) : '';
    this.setData({ venueId, venueName });
  },

  onShow() {
    if (!guardAdminPage()) return;
    if (this.data.venueId) this.loadVenue();
  },

  onPullDownRefresh() {
    if (!this.data.venueId) {
      wx.stopPullDownRefresh();
      return;
    }
    this.loadVenue().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  async loadVenue() {
    const loadId = ++this._loadId;
    this.setData({ loading: true, loadError: false });
    try {
      const res: any = await AdminService.getVenues(1, 100);
      const list: Venue[] = res?.list || [];
      const venue = list.find((item: Venue) => item.id === this.data.venueId);

      if (loadId !== this._loadId) return;
      if (!venue) {
        // 该场馆可能已被下架或从可管理范围移除，明确报错而不是展示空白
        this.setData({ loading: false, loadError: true, venue: null });
        return;
      }
      this.setData({
        loading: false,
        venue,
        venueName: venue.name,
        coverImage: venueImage(venue.coverImage),
        closedRanges: (venue as any).closedRanges || [],
      });
      wx.setNavigationBarTitle({ title: venue.name });
    } catch (err) {
      if (loadId !== this._loadId) return;
      console.error('加载场馆详情失败:', err);
      this.setData({ loading: false, loadError: true });
    }
  },

  onRetry() {
    this.loadVenue();
  },

  onImageError() {
    this.setData({ coverImage: '/assets/ui/venue.svg' });
  },

  venueTypeName(type: string) {
    return getVenueTypeName(type);
  },

  priceText(price: number) {
    return formatMoney(price);
  },

  /** ===== 编辑资料：复用全馆列表页的表单页，避免两套表单逻辑分叉 ===== */
  goEdit() {
    if (!this.data.venueId) return;
    wx.navigateTo({
      url: `/pages/admin/venues/venues?editId=${encodeURIComponent(this.data.venueId)}`,
    });
  },

  /** ===== 排期管理 ===== */
  goSchedule() {
    const { venueId, venueName } = this.data;
    if (!venueId) return;
    wx.navigateTo({
      url: `/pages/admin/venue-schedule/venue-schedule?venueId=${encodeURIComponent(venueId)}&venueName=${encodeURIComponent(venueName)}`,
    });
  },

  /** ===== 该场馆的预约监管 ===== */
  goBookings() {
    wx.navigateTo({
      url: `/pages/admin/bookings/bookings?venueId=${encodeURIComponent(this.data.venueId)}`,
    });
  },

  /** ===== 上架 / 下架 ===== */
  async toggleStatus() {
    const venue = this.data.venue;
    if (!venue || this.data.submitting) return;
    const nextStatus = venue.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const isOffline = nextStatus === 'INACTIVE';

    wx.showModal({
      title: isOffline ? '确认下架场馆' : '确认重新上架',
      content: isOffline
        ? `下架后【${venue.name}】将不再出现在用户端预约列表中，已生效的预约与订单不受影响。`
        : `重新上架后【${venue.name}】将恢复对普通用户可见。`,
      confirmColor: isOffline ? '#FF4D4F' : '#00B96B',
      success: async (res) => {
        if (!res.confirm) return;
        this.setData({ submitting: true });
        try {
          await AdminService.updateVenue(venue.id, { status: nextStatus });
          wx.showToast({
            title: isOffline ? '已下架' : '已重新上架',
            icon: 'none',
          });
          this.loadVenue();
        } catch (err: any) {
          wx.showToast({ title: err.message || '操作失败', icon: 'none' });
        } finally {
          this.setData({ submitting: false });
        }
      },
    });
  },

  /** ===== 临时闭馆（支持日期区间）===== */
  setClosedRange() {
    const venue = this.data.venue;
    if (!venue) return;

    wx.showModal({
      title: '临时闭馆',
      editable: true,
      placeholderText: '请输入闭馆说明，如：校队训练占用',
      confirmText: '今日闭馆',
      cancelText: '更多选项',
      success: async (res) => {
        if (!res.confirm) {
          // 「更多选项」进入全馆列表页的闭馆区间弹窗，能力不重复实现
          wx.navigateTo({
            url: `/pages/admin/venues/venues?venueId=${encodeURIComponent(venue.id)}&action=closeRange`,
          });
          return;
        }
        const reason = (res.content || '').trim() || '临时维护保养';
        const today = new Date();
        const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        this.setData({ submitting: true });
        try {
          await AdminService.setClosedDate(venue.id, date, date, reason);
          wx.showToast({ title: '今日已闭馆', icon: 'success' });
          this.loadVenue();
        } catch (err: any) {
          wx.showToast({ title: err.message || '设置失败', icon: 'none' });
        } finally {
          this.setData({ submitting: false });
        }
      },
    });
  },

  /** ===== 直接开馆 ===== */
  reopenVenue() {
    const venue = this.data.venue;
    if (!venue || this.data.submitting) return;

    wx.showModal({
      title: '确认直接开馆',
      content: `确定将【${venue.name}】恢复开馆？这会清除该场馆所有未来的临时闭馆日期，并恢复为上架运营状态。`,
      confirmColor: '#13C2C2',
      success: async (res) => {
        if (!res.confirm) return;
        this.setData({ submitting: true });
        try {
          await AdminService.reopenVenue(venue.id);
          wx.showToast({ title: '已恢复开馆', icon: 'success' });
          this.loadVenue();
        } catch (err: any) {
          wx.showToast({ title: err.message || '恢复开馆失败', icon: 'none' });
        } finally {
          this.setData({ submitting: false });
        }
      },
    });
  },
});
