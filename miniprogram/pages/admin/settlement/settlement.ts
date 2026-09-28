import { AdminService } from '../../../services/admin.service';
import { CanvasChart } from '../../../utils/chart';
import { guardAdminPage } from '../../../utils/admin-guard';

Page({
  data: {
    kpi: {} as any,
  },

  onShow() {
    if (!guardAdminPage()) return;
    this.loadData();
  },

  onPullDownRefresh() {
    this.loadData().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  async loadData() {
    try {
      const data = await AdminService.getDashboardOverview();
      this.setData({ kpi: data.kpi });

      // 绘制折线图
      const lineData = data.incomeTrend.map((d) => ({
        date: d.date,
        value: d.income,
      }));
      setTimeout(() => {
        CanvasChart.drawLineChart('settleTrendCanvas', lineData, 320, 180, this, '#00B96B', true);
      }, 100);

      // 绘制环形饼图
      const pieData = data.venuePieData.map((d) => ({
        name: d.name,
        value: d.value,
        percentage: d.percentage,
      }));
      setTimeout(() => {
        CanvasChart.drawDonutChart('settlePieCanvas', pieData, 320, 160, this);
      }, 150);
    } catch (err) {
      console.error('加载资金看板失败:', err);
    }
  },
});
