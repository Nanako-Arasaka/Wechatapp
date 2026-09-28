import { AdminService } from '../../../services/admin.service';
import { guardAdminPage } from '../../../utils/admin-guard';

Page({
  data: {
    bookings: [] as any[],
    keyword: '',
    currentStatus: 'ALL',
    loading: true,
    loadError: false,
    checkingIn: false,
    page: 1,
    hasMore: true,
    statusTabs: [
      { key: 'ALL', label: '全部' },
      { key: 'CONFIRMED', label: '待核销' },
      { key: 'CHECKED_IN', label: '已入场' },
      { key: 'COMPLETED', label: '已完成' },
      { key: 'REFUNDED', label: '已退款' },
    ],
  },
  _loadId: 0,

  onShow() {
    if (!guardAdminPage()) return;
    this.loadBookings();
  },

  onPullDownRefresh() {
    this.loadBookings().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) this.loadBookings(true);
  },

  onSearchConfirm() {
    this.loadBookings();
  },

  onInputKeyword(e: any) {
    this.setData({ keyword: e.detail.value });
  },

  onSelectStatus(e: any) {
    const key = e.currentTarget.dataset.key;
    this.setData({ currentStatus: key });
    this.loadBookings();
  },

  async loadBookings(append: boolean = false) {
    if (append && this.data.loading) return;
    const loadId = ++this._loadId;
    const status = this.data.currentStatus;
    const keyword = this.data.keyword.trim();
    const page = append ? this.data.page + 1 : 1;
    this.setData({ loading: true, loadError: false });
    try {
      const res: any = await AdminService.getBookings({
        page,
        pageSize: 50,
        status: status !== 'ALL' ? status : undefined,
        keyword: keyword || undefined,
      });
      if (loadId !== this._loadId) return;
      const list = res.list || [];
      this.setData({ bookings: append ? [...this.data.bookings, ...list] : list, page, hasMore: page * 50 < res.total });
    } catch (err) {
      if (loadId !== this._loadId) return;
      console.error('加载预约列表失败:', err);
      this.setData({ loadError: true });
    } finally {
      if (loadId === this._loadId) this.setData({ loading: false });
    }
  },

  async quickCheckin(e: any) {
    if (this.data.checkingIn) return;
    const bookingId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认一键核销？',
      content: '确认核销该客户的场地预约并允许其入场？',
      success: async (res) => {
        if (res.confirm && !this.data.checkingIn) {
          this.setData({ checkingIn: true });
          try {
            await AdminService.confirmCheckin(bookingId);
            wx.showToast({ title: '核销成功，已入场', icon: 'success' });
            this.loadBookings();
          } catch (err) {
            // 异常已处理
          } finally {
            this.setData({ checkingIn: false });
          }
        }
      },
    });
  },
});
