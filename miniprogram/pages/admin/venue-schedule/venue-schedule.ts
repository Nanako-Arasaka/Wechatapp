import { VenueService } from "../../../services/venue.service";
import { AdminService } from "../../../services/admin.service";
import { bookingDates } from "../../../utils/booking-calendar";
import { formatDate, getWeekdayName } from "../../../utils/format";
import { guardAdminPage } from "../../../utils/admin-guard";

/**
 * 管理端场馆排期页（AdminVenueSchedulePage）
 * ----------------------------------------------------------------------------
 * 管理员在这里开关未来若干天的时段使用权（不是「管理员专属预约」）：
 * - 开放：普通用户可预约
 * - 封锁：仅管理员内部使用，普通用户在用户端完全看不到
 * - 关闭：普通用户看不到且不占用容量
 *
 * 后端接口尚未就绪（见 docs/backend-requests.md 的 A5 时段开关）。
 * 本页已按契约实现调用与交互，接口返回非 0 时会给出明确提示，
 * 不会静默失败让管理员误以为已生效。
 */
type SlotAction = 'open' | 'block' | 'close';

Page({
  data: {
    venueId: "",
    venueName: "",
    currentDate: "",
    days: [] as Array<{ date: string; weekday: string; isToday: boolean }>,
    slots: [] as any[],
    isClosed: false,
    closedReason: "",
    loading: true,
    loadError: false,
    /** 可管理的日期窗口，跟随场馆配置的可提前预约天数 */
    advanceDays: 7,

    /** 批量操作：把某个动作应用到未来 N 天 */
    batchRangeOpen: false,
    batchDays: 3,

    /** 单个时段的开关弹层 */
    actionSheet: {
      visible: false,
      slot: null as any,
      reason: '',
    },
    submitting: false,
  },

  onShow() {
    // 管理端页面必须鉴权，防止普通用户通过分享 URL 直达
    if (!guardAdminPage()) return;
  },

  onLoad(options: any) {
    const venueId = options.venueId || "";
    const rawName = options.venueName || "";
    const venueName = rawName ? decodeURIComponent(rawName) : "";
    const today = formatDate(new Date());
    this.setData({
      venueId,
      venueName,
      currentDate: today,
      days: this.buildDays(today, 7),
    });
    if (venueName) {
      wx.setNavigationBarTitle({ title: `${venueName} 排期` });
    }
    this.loadSchedule(today);
  },

  /** 按窗口天数构建日期条；与用户端选日页共用同一套 advanceDays 口径 */
  buildDays(today: string, advanceDays: number) {
    return bookingDates(new Date(), advanceDays).map((date) => ({
      date,
      weekday: getWeekdayName(date),
      isToday: date === today,
    }));
  },

  onSelectDate(e: any) {
    const date = e.currentTarget.dataset.date as string;
    if (!date || date === this.data.currentDate) return;
    this.setData({ currentDate: date });
    this.loadSchedule(date);
  },

  async loadSchedule(date: string) {
    if (!this.data.venueId) return;
    this.setData({ loading: true, loadError: false, slots: [] });
    try {
      const [venue, avail] = await Promise.all([
        VenueService.getVenueDetail(this.data.venueId),
        VenueService.getAvailability(this.data.venueId, date),
      ]);
      if (venue?.name && !this.data.venueName) {
        wx.setNavigationBarTitle({ title: `${venue.name} 排期` });
      }
      // 管理端可查看的窗口同样跟随场馆配置，避免管理员看到用户约不到的日期
      const advanceDays = Number(venue?.advanceDays) || 7;
      if (advanceDays !== this.data.advanceDays) {
        this.setData({
          advanceDays,
          days: this.buildDays(formatDate(new Date()), advanceDays),
        });
      }
      this.setData({
        venueName: venue?.name || this.data.venueName,
        slots: avail.slots || [],
        isClosed: avail.isClosed,
        closedReason: avail.closedReason || "",
      });
    } catch (err) {
      console.error("加载排期失败:", err);
      this.setData({ loadError: true });
    } finally {
      this.setData({ loading: false });
    }
  },

  onRetry() {
    this.loadSchedule(this.data.currentDate);
  },

  // ===== 单时段开关 =====

  onTapSlot(e: any) {
    if (this.data.submitting) return;
    const slot = e.currentTarget.dataset.slot;
    if (!slot) return;
    this.setData({
      actionSheet: { visible: true, slot, reason: slot.blockReason || '' },
    });
  },

  closeActionSheet() {
    if (this.data.submitting) return;
    this.setData({ "actionSheet.visible": false });
  },

  noBubble() {},

  onReasonInput(e: any) {
    this.setData({ "actionSheet.reason": e.detail.value || "" });
  },

  /**
   * 应用单个时段的开关。传入 action 与 reason；
   * reason 由弹层输入框读取，调用方不需要关心 setData 路径。
   */
  async applySlotAction(slotId: string, action: SlotAction, reason: string) {
    await AdminService.setSlotAvailability(slotId, action, reason);
    // 局部刷新比重载整页更省，也避免管理员失去当前日期上下文
    await this.loadSchedule(this.data.currentDate);
  },

  async onPickAction(e: any) {
    const action = e.currentTarget.dataset.action as SlotAction;
    const slot = this.data.actionSheet.slot;
    if (!slot || this.data.submitting) return;

    // 封锁必须写明原因，否则管理员自己也记不清这块场地被占了
    if (action !== 'open' && !this.data.actionSheet.reason.trim()) {
      wx.showToast({ title: '请填写占用原因', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    try {
      await this.applySlotAction(slot.id, action, this.data.actionSheet.reason.trim());
      this.setData({ "actionSheet.visible": false });
      wx.showToast({ title: '已更新时段状态', icon: 'success' });
    } catch (err: any) {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },

  // ===== 批量操作 =====

  onToggleBatch() {
    this.setData({ batchRangeOpen: !this.data.batchRangeOpen });
  },

  onBatchDaysChange(e: any) {
    this.setData({ batchDays: Number(e.detail.value) || 3 });
  },

  /** 把同一动作应用到未来 N 天的同一时段 */
  async onBatchApply(e: any) {
    const action = e.currentTarget.dataset.action as SlotAction;
    if (this.data.submitting) return;
    if (!this.data.venueId) return;

    const days = this.data.batchDays || 3;
    const today = formatDate(new Date());
    const targetDates = bookingDates(new Date(), days);

    const confirmed = await new Promise<boolean>((resolve) => {
      wx.showModal({
        title: '批量调整时段',
        content:
          `将未来 ${days} 天内的同一时段全部${
            action === 'open' ? '设为开放' : action === 'block' ? '设为封锁' : '关闭'
          }，确认继续？`,
        confirmColor: '#1677FF',
        success: (res) => resolve(!!res.confirm),
        fail: () => resolve(false),
      });
    });
    if (!confirmed) return;

    this.setData({ submitting: true });
    try {
      const res: any = await AdminService.batchSetSlotAvailability({
        venueId: this.data.venueId,
        startTime: this.data.actionSheet.slot?.startTime || '',
        dates: targetDates,
        action,
        reason: this.data.actionSheet.reason?.trim() || '',
      });
      // 单日失败不影响其余日期，这里汇总提示而不是第一处就中断
      if (res && typeof res.successCount === 'number') {
        wx.showToast({
          title: `已更新 ${res.successCount}/${targetDates.length} 天`,
          icon: res.successCount > 0 ? 'success' : 'none',
        });
      } else {
        wx.showToast({ title: '批量调整已提交', icon: 'success' });
      }
      this.setData({ batchRangeOpen: false, "actionSheet.visible": false });
      this.loadSchedule(today);
    } catch (err: any) {
      wx.showToast({ title: err.message || '批量调整失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },
});
