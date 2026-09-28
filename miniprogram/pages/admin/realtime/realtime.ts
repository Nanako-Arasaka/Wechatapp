import { AdminService } from '../../../services/admin.service';
import { guardAdminPage } from '../../../utils/admin-guard';

Page({
  data: {
    venueStatusList: [] as any[],
    timer: null as any,
  },

  onShow() {
    if (!guardAdminPage()) return;
    this.loadRealtimeData();
    this.startPolling();
  },

  onHide() {
    this.stopPolling();
  },

  onUnload() {
    this.stopPolling();
  },

  onPullDownRefresh() {
    this.loadRealtimeData().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  startPolling() {
    this.stopPolling();
    const timer = setInterval(() => {
      this.loadRealtimeData(true);
    }, 30000);
    this.setData({ timer });
  },

  stopPolling() {
    if (this.data.timer) {
      clearInterval(this.data.timer);
      this.setData({ timer: null });
    }
  },

  async loadRealtimeData(silent: boolean = false) {
    try {
      const list: any = await AdminService.getRealtimeStatus();
      this.setData({ venueStatusList: list });
      if (!silent) {
        wx.showToast({ title: '实时监控已同步', icon: 'none' });
      }
    } catch (err) {
      console.error('加载实时监控数据失败:', err);
    }
  },
});
