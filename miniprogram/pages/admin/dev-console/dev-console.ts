import { AdminService } from '../../../services/admin.service';
import { guardAdminPage } from '../../../utils/admin-guard';
import { AuthStore } from '../../../store/auth';

Page({
  data: { submitting: false },

  onShow() {
    guardAdminPage();
  },

  async handleGeneratePeak() {
    if (!AuthStore.isSuperAdmin() || this.data.submitting) return;
    this.setData({ submitting: true });
    try {
      const res: any = await AdminService.devGeneratePeak();
      wx.showModal({
        title: '注入成功！',
        content: res.message || '今日晚高峰已成功设为【爆满】状态，可去实时监控大屏查看！',
        showCancel: false,
      });
    } catch (err) {
      // 异常已处理
    } finally {
      this.setData({ submitting: false });
    }
  },

  async handleExpireOrders() {
    if (!AuthStore.isSuperAdmin() || this.data.submitting) return;
    this.setData({ submitting: true });
    try {
      const res: any = await AdminService.devExpireOrders();
      wx.showModal({
        title: '扫描完成',
        content: res.message || '已成功扫描超时待支付订单并释放库存。',
        showCancel: false,
      });
    } catch (err) {
      // 异常已处理
    } finally {
      this.setData({ submitting: false });
    }
  },

  goToDashboard() {
    wx.navigateTo({ url: '/pages/admin/dashboard/dashboard' });
  },
});
