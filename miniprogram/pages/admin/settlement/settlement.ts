import { AdminService } from '../../../services/admin.service';
import { CanvasChart } from '../../../utils/chart';
import { guardAdminPage } from '../../../utils/admin-guard';

Page({
  data: {
    kpi: {} as any,
    loading: true,
    loadError: false,
  },

  onShow() {
    if (!guardAdminPage()) return;
    this.loadData();
  },

  onPullDownRefresh() {
    this.loadData().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  async loadData() {
    this.setData({ loading: true, loadError: false });
    try {
      const data = await AdminService.getDashboardOverview();
      this.setData({ kpi: data.kpi });

      // 绘制折线图
      const lineData = data.incomeTrend.map((d) => ({
        date: d.date,
        value: d.income,
      }));
      CanvasChart.drawInPage('settleTrendCanvas', this, (width, height) => {
        CanvasChart.drawLineChart('settleTrendCanvas', lineData, width, height, this, '#00B96B', true);
      });

      // 绘制环形饼图
      const pieData = data.venuePieData.map((d) => ({
        name: d.name,
        value: d.value,
        percentage: d.percentage,
      }));
      CanvasChart.drawInPage('settlePieCanvas', this, (width, height) => {
        CanvasChart.drawDonutChart('settlePieCanvas', pieData, width, height, this);
      });
    } catch (err) {
      console.error('加载资金看板失败:', err);
      this.setData({ loadError: true, kpi: {} });
    } finally {
      this.setData({ loading: false });
    }
  },
});
