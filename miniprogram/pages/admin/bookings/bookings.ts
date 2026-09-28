import { AdminService } from '../../../services/admin.service';
import { guardAdminPage } from '../../../utils/admin-guard';

Page({
  data: {
    bookings: [] as any[],
    keyword: '',
    currentStatus: 'ALL',
    statusTabs: [
      { key: 'ALL', label: '全部' },
      { key: 'CONFIRMED', label: '待核销' },
      { key: 'CHECKED_IN', label: '已入场' },
      { key: 'COMPLETED', label: '已完成' },
      { key: 'REFUNDED', label: '已退款' },
    ],
  },

  onShow() {
    if (!guardAdminPage()) return;
    this.loadBookings();
  },

  onPullDownRefresh() {
    this.loadBookings().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  onInputKeyword(e: any) {
    this.setData({ keyword: e.detail.value });
  },

  onSelectStatus(e: any) {
    const key = e.currentTarget.dataset.key;
    this.setData({ currentStatus: key });
    this.loadBookings();
  },

  async loadBookings() {
    try {
      const res: any = await AdminService.getBookings({
        page: 1,
        pageSize: 50,
        status: this.data.currentStatus !== 'ALL' ? this.data.currentStatus : undefined,
        keyword: this.data.keyword || undefined,
      });
      this.setData({ bookings: res.list || [] });
    } catch (err) {
      console.error('加载预约列表失败:', err);
    }
  },

  async quickCheckin(e: any) {
    const bookingId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认一键核销？',
      content: '确认核销该客户的场地预约并允许其入场？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await AdminService.confirmCheckin(bookingId);
            wx.showToast({ title: '核销成功，已入场', icon: 'success' });
            this.loadBookings();
          } catch (err) {
            // 异常已处理
          }
        }
      },
    });
  },
});
