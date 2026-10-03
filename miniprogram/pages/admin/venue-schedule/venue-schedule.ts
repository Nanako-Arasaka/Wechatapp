import { VenueService } from "../../../services/venue.service";
import { bookingDates } from "../../../utils/booking-calendar";
import { formatDate, getWeekdayName } from "../../../utils/format";
import { guardAdminPage } from "../../../utils/admin-guard";

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
    const days = bookingDates(new Date(), 7).map((date) => ({
      date,
      weekday: getWeekdayName(date),
      isToday: date === today,
    }));
    this.setData({ venueId, venueName, currentDate: today, days });
    if (venueName) {
      wx.setNavigationBarTitle({ title: `${venueName} 排期` });
    }
    this.loadSchedule(today);
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
});
