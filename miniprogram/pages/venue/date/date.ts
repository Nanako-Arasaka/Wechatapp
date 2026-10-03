import { bookingDates } from "../../../utils/booking-calendar";
import { formatDate, getWeekdayName } from "../../../utils/format";

Page({
  data: {
    venueId: "",
    currentDate: "",
    days: [] as Array<{ date: string; weekday: string; isToday: boolean }>,
  },

  onLoad(options: any) {
    const venueId = options.id || "";
    const currentDate = options.date || formatDate(new Date());
    const today = formatDate(new Date());
    const days = bookingDates(new Date(), 7).map((date) => ({
      date,
      weekday: getWeekdayName(date),
      isToday: date === today,
    }));
    this.setData({ venueId, currentDate, days });
  },

  onSelectDate(e: any) {
    const date = e.currentTarget.dataset.date as string;
    if (!date || !this.data.venueId) return;
    wx.redirectTo({
      url: `/pages/venue/booking/booking?id=${encodeURIComponent(this.data.venueId)}&date=${encodeURIComponent(date)}`,
    });
  },
});
