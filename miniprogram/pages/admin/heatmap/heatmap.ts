import { AdminService } from '../../../services/admin.service';
import { guardAdminPage } from '../../../utils/admin-guard';

Page({
  data: {
    hours: [] as string[],
    rows: [] as any[],
    loading: true,
    loadError: false,
  },

  onShow() {
    if (!guardAdminPage()) return;
    this.loadHeatmap();
  },

  async loadHeatmap() {
    this.setData({ loading: true, loadError: false });
    try {
      const res: any = await AdminService.getHeatmap();
      if (!Array.isArray(res?.days) || !Array.isArray(res.hours) || !Array.isArray(res.matrix) || res.matrix.length !== res.days.length) throw new Error('热力图数据异常');
      const rows = res.days.map((day: string, dayIdx: number) => {
        const values = res.matrix[dayIdx];
        if (!Array.isArray(values) || values.length !== res.hours.length || values.some((value: any) => !Number.isFinite(value))) throw new Error('热力图数据异常');
        return {
          day,
          cells: res.hours.map((hour: string, hourIdx: number) => {
            const value = Math.min(100, Math.max(0, values[hourIdx]));
            return { hour, value, background: this.getCellBg(value), color: value >= 75 ? '#FFFFFF' : '#1F2329' };
          }),
        };
      });
      this.setData({ hours: res.hours, rows });
    } catch (err) {
      this.setData({ loadError: true, rows: [], hours: [] });
    } finally {
      this.setData({ loading: false });
    }
  },

  onPullDownRefresh() {
    this.loadHeatmap().finally(() => wx.stopPullDownRefresh());
  },

  getCellBg(val: number) {
    if (val >= 90) return '#002C8C';
    if (val >= 75) return '#1677FF';
    if (val >= 55) return '#4096FF';
    if (val >= 35) return '#91CAFF';
    return '#E6F4FF';
  },

  onCellTap(e: any) {
    const { day, hour, val } = e.currentTarget.dataset;
    let tip = '负荷正常';
    if (val >= 90) tip = '严重爆满，建议加大调度或错峰分流';
    else if (val >= 75) tip = '高峰繁忙时段';
    else if (val < 40) tip = '利用率偏低，可推非高峰特惠券';

    wx.showModal({
      title: `${day} ${hour} 时段分析`,
      content: `历史平均负荷率：${val}%\n运营诊断：${tip}`,
      showCancel: false,
    });
  },
});
