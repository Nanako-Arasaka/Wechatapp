/**
 * ============================================================================
 * 微信小程序原生轻量级 Canvas 图表渲染引擎 (CanvasChart)
 * ----------------------------------------------------------------------------
 * 架构考量：
 * 1. 零三方依赖：避免引入 ECharts 等体积庞大（>800KB）的第三方库，保持小程序极其小巧秒开。
 * 2. 纯原生 CanvasContext 绘制：兼容微信开发者工具与各移动真机渲染环境。
 * 3. 支持平滑渐变面积折线图 (Line Chart) 与 环形占比饼图 (Donut Chart)。
 * ============================================================================
 */

export class CanvasChart {
  /**
   * 绘制平滑折线图 (带渐变面积填充、标尺参考线与高亮数据点)
   *
   * @param canvasId WXML 中的 canvas-id
   * @param data 数据序列：[{ date: '08-25', value: 3860 }, ...]
   * @param width 画布总宽度 (px)
   * @param height 画布总高度 (px)
   * @param componentInstance 组件/页面 this 指针
   * @param lineColor 折线主色调 (默认 #1677FF)
   * @param fillGradient 是否开启面积渐变浅色填充
   */
  static drawLineChart(
    canvasId: string,
    data: Array<{ date: string; value: number }>,
    width: number,
    height: number,
    componentInstance?: any,
    lineColor: string = '#1677FF',
    fillGradient: boolean = true,
  ) {
    if (!data || data.length === 0) return;

    const ctx = componentInstance
      ? wx.createCanvasContext(canvasId, componentInstance)
      : wx.createCanvasContext(canvasId);

    // 预留内边距（容纳 X/Y 轴文字与刻度）
    const padding = { top: 25, right: 20, bottom: 35, left: 35 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const maxVal = Math.max(...data.map((d) => d.value), 10);
    const minVal = 0;
    const valRange = maxVal - minVal;

    // 清空画布背景
    ctx.clearRect(0, 0, width, height);

    // 1. 绘制 3 条水平参考虚线及 Y 轴标尺
    ctx.setStrokeStyle('#F0F0F0');
    ctx.setLineWidth(1);
    ctx.setLineDash([4, 4], 0);
    for (let i = 0; i <= 3; i++) {
      const y = padding.top + (chartH / 3) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      // 标尺数值
      const labelVal = Math.round(maxVal - (valRange / 3) * i);
      ctx.setFontSize(10);
      ctx.setFillStyle('#8C8C8C');
      ctx.fillText(String(labelVal), 4, y + 3);
    }
    ctx.setLineDash([], 0); // 恢复实线模式

    // 2. 将业务数据映射为像素坐标点 (x, y)
    const points = data.map((d, idx) => {
      const x = padding.left + (chartW / (data.length - 1 || 1)) * idx;
      const y = padding.top + chartH - ((d.value - minVal) / valRange) * chartH;
      return { x, y, ...d };
    });

    // 3. 绘制平滑面积浅色阴影填充
    if (fillGradient && points.length > 1) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, padding.top + chartH);
      points.forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.lineTo(points[points.length - 1].x, padding.top + chartH);
      ctx.closePath();
      ctx.setFillStyle('rgba(22, 119, 255, 0.12)');
      ctx.fill();
    }

    // 4. 绘制折线骨架
    ctx.beginPath();
    ctx.setStrokeStyle(lineColor);
    ctx.setLineWidth(2.5);
    ctx.setLineCap('round');
    ctx.setLineJoin('round');
    points.forEach((p, idx) => {
      if (idx === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();

    // 5. 绘制外圈白底实心数据圆点与 X 轴日期文本
    points.forEach((p) => {
      // 节点外圈白底
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
      ctx.setFillStyle('#FFFFFF');
      ctx.fill();

      // 节点中心实心色
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.5, 0, 2 * Math.PI);
      ctx.setFillStyle(lineColor);
      ctx.fill();

      // X 轴日期文本居中定位
      ctx.setFontSize(10);
      ctx.setFillStyle('#595959');
      const textW = ctx.measureText ? ctx.measureText(p.date).width : 20;
      ctx.fillText(p.date, p.x - textW / 2, height - 10);
    });

    // 执行渲染
    ctx.draw();
  }

  /**
   * 绘制环形饼图 (Donut Chart 带右侧图例 Legend)
   *
   * @param canvasId WXML 中的 canvas-id
   * @param data 数据项：[{ name: '羽毛球馆', value: 3800, percentage: 38 }, ...]
   * @param width 画布总宽度 (px)
   * @param height 画布总高度 (px)
   * @param componentInstance 组件/页面 this 指针
   */
  static drawDonutChart(
    canvasId: string,
    data: Array<{ name: string; value: number; percentage: number; color?: string }>,
    width: number,
    height: number,
    componentInstance?: any,
  ) {
    if (!data || data.length === 0) return;

    const ctx = componentInstance
      ? wx.createCanvasContext(canvasId, componentInstance)
      : wx.createCanvasContext(canvasId);

    const centerX = width * 0.38;
    const centerY = height * 0.5;
    const outerRadius = Math.min(centerX, centerY) * 0.78;
    const innerRadius = outerRadius * 0.58;

    // 现代科技调色板
    const colors = ['#1677FF', '#00B96B', '#FA8C16', '#722ED1', '#13C2C2', '#F5222D'];
    const total = data.reduce((sum, d) => sum + d.value, 0) || 1;

    ctx.clearRect(0, 0, width, height);

    let startAngle = -Math.PI / 2; // 从 12 点钟正上方开始逆时针绘制

    // 1. 依次绘制各扇形环
    data.forEach((item, idx) => {
      const sliceAngle = (item.value / total) * 2 * Math.PI;
      const endAngle = startAngle + sliceAngle;
      const color = item.color || colors[idx % colors.length];

      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle);
      ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
      ctx.closePath();
      ctx.setFillStyle(color);
      ctx.fill();

      startAngle = endAngle;
    });

    // 2. 绘制环心白色背景与居中标题
    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius, 0, 2 * Math.PI);
    ctx.setFillStyle('#FFFFFF');
    ctx.fill();

    ctx.setFontSize(12);
    ctx.setFillStyle('#262626');
    ctx.setTextAlign('center');
    ctx.fillText('营收占比', centerX, centerY + 4);

    // 3. 绘制右侧图例列表 (Legend)
    const legendX = width * 0.68;
    const legendStartY = height * 0.18;
    const legendItemH = 22;

    data.slice(0, 5).forEach((item, idx) => {
      const y = legendStartY + idx * legendItemH;
      const color = item.color || colors[idx % colors.length];

      // 图例小圆标
      ctx.beginPath();
      ctx.arc(legendX, y, 4, 0, 2 * Math.PI);
      ctx.setFillStyle(color);
      ctx.fill();

      // 图例文字与百分比
      ctx.setTextAlign('left');
      ctx.setFontSize(10);
      ctx.setFillStyle('#595959');
      ctx.fillText(`${item.name} ${item.percentage}%`, legendX + 10, y + 3);
    });

    ctx.draw();
  }
}
