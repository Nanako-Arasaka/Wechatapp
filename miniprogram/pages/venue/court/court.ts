import { VenueService } from '../../../services/venue.service';
import { formatMoney, safeDecode } from '../../../utils/format';

/**
 * ============================================================================
 * P3 可选场地页 (CourtSelectPage)
 * ----------------------------------------------------------------------------
 * 用户目标：在已选定时段内挑选场地。
 * 核心交互逻辑：
 * 1. 接收 P2 传来的预约基础信息（场馆/日期/时段/单价）。
 * 2. 再次调用 GET /venues/:id/availability 获取目标时段的场地可用状态，
 *    按时段总容量生成场地列表：绿色 = 可预约，灰色 = 不可预约（已被占用）。
 * 3. 场地以底部弹窗弹层形式展示，点击绿色场地块完成选中标记。
 * 4. 点击【下一步】跳转 P4 填写预约信息页（order/fill-info，P4 不做任何修改）。
 * ============================================================================
 */
Page({
  data: {
    // ===== P2 透传的预约基础信息 =====
    venueId: '',
    venueName: '',
    venueAddress: '',
    slotId: '',
    date: '',
    timeRange: '',
    price: 0, // 单价（分）
    priceText: '', // 单价展示文本

    // ===== 页面状态 =====
    courts: [] as Array<{ no: number; available: boolean; selected: boolean }>, // 场地列表
    selectedCourtNo: 0, // 已选场地编号（0 = 未选）
    navigating: false, // 下一步跳转防连点
    loading: true,
    loadError: false, // 加载失败标记（错误占位 + 重试）
    unavailableReason: '',
    sheetVisible: false, // 底部弹窗弹层是否已弹起（用于入场动画）
  },

  onLoad(options: any) {
    // 解析 P2 透传参数
    this.setData({
      venueId: options.venueId || '',
      venueName: safeDecode(options.venueName || ''),
      venueAddress: safeDecode(options.venueAddress || ''),
      slotId: options.slotId || '',
      date: options.date || '',
      timeRange: safeDecode(options.timeRange || ''),
      price: Number(options.price || 0),
      priceText: formatMoney(Number(options.price || 0)),
    });

    this.loadCourts();
  },

  /**
   * 加载目标时段的场地可用状态
   * 调用 GET /venues/:id/availability?date= 获取该时段总容量与已占用量，
   * 据此推导每块场地（1号场 ~ N号场）的可预约状态。
   */
  async loadCourts() {
    try {
      this.setData({ loading: true, loadError: false, unavailableReason: '', sheetVisible: false, courts: [], selectedCourtNo: 0 });
      if (!this.data.venueId || !this.data.slotId) throw new Error('缺少预约时段');

      const [courtData, availability] = await Promise.all([
        VenueService.getSlotCourts(this.data.venueId, this.data.slotId),
        VenueService.getAvailability(this.data.venueId, this.data.date),
      ]);
      const slot = availability.slots.find((item) => item.id === this.data.slotId);
      if (availability.isClosed || !slot || !slot.isSelectable) {
        this.setData({ unavailableReason: slot?.statusText || availability.closedReason || '该时段暂不可预约' });
        return;
      }
      const totalCapacity = courtData.totalCapacity;
      const occupied = courtData.occupied;
      if (!Number.isInteger(totalCapacity) || totalCapacity < 0 || !Array.isArray(occupied) || occupied.some((no) => !Number.isInteger(no) || no < 1 || no > totalCapacity)) {
        throw new Error('场地状态数据异常');
      }

      if (totalCapacity > 0) {
        const courts = [];
        for (let i = 1; i <= totalCapacity; i++) {
          courts.push({ no: i, available: !occupied.includes(i), selected: false });
        }
        this.setData({ courts });
      }

      // 数据准备好后再展示选场层，避免失败时出现空弹层。
      if (totalCapacity > 0) this.setData({ sheetVisible: true });
    } catch (err) {
      console.error('加载场地可用状态失败:', err);
      this.setData({ loadError: true, sheetVisible: false });
    } finally {
      this.setData({ loading: false });
    }
  },

  onRetry() {
    this.loadCourts();
  },

  onPullDownRefresh() {
    this.loadCourts().finally(() => wx.stopPullDownRefresh());
  },

  /**
   * 点击选中某块场地
   * 绿色（可预约）场地块可选中并做标记，灰色（不可预约）场地块点击拦截
   */
  onSelectCourt(e: any) {
    const no = e.currentTarget.dataset.no as number;
    const court = this.data.courts.find((c) => c.no === no);

    if (!court || !court.available) {
      // 灰色不可预约场地：轻提示拦截
      wx.showToast({ title: '该场地不可预约', icon: 'none' });
      return;
    }

    // 刷新全部场地的选中标记：仅当前点击的场地被选中
    const courts = this.data.courts.map((c) => ({
      ...c,
      selected: c.no === no,
    }));

    this.setData({ courts, selectedCourtNo: no });
  },

  /**
   * 点击【下一步】：跳转 P4 填写预约信息页（P4 页面不做任何修改）
   * 参数与 P4（order/fill-info）onLoad 期望完全一致：
   * venueId / venueName / venueAddress / slotId / date / timeRange / unitPrice / quantity
   */
  goToFillInfo() {
    if (this.data.navigating || this.data.loading || this.data.loadError || this.data.unavailableReason) return;
    if (!this.data.selectedCourtNo) {
      wx.showToast({ title: '请先选择场地', icon: 'none' });
      return;
    }

    this.setData({ navigating: true });
    const params = [
      `venueId=${encodeURIComponent(this.data.venueId)}`,
      `venueName=${encodeURIComponent(this.data.venueName)}`,
      `venueAddress=${encodeURIComponent(this.data.venueAddress)}`,
      `slotId=${encodeURIComponent(this.data.slotId)}`,
      `date=${encodeURIComponent(this.data.date)}`,
      `timeRange=${encodeURIComponent(this.data.timeRange)}`,
      `unitPrice=${this.data.price}`,
      `quantity=1`,
      `courtNo=${this.data.selectedCourtNo}`,
    ].join('&');

    wx.navigateTo({
      url: `/pages/order/fill-info/fill-info?${params}`,
      complete: () => this.setData({ navigating: false }),
    });
  },
});
