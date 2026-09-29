import { VenueService } from "../../services/venue.service";
import { AuthStore } from "../../store/auth";
import { NotificationService } from "../../services/notification.service";
import { Venue, VenueSlot } from "../../types";

Page({
  data: {
    currentLocation: wx.getStorageSync("CURRENT_LOCATION") || "选择位置",
    keyword: "",
    searchFocused: false,
    venues: [] as Venue[],
    recommendedVenues: [] as Venue[],
    selectedVenueId: "",
    quickSlots: [] as VenueSlot[],
    isClosedToday: false,
    closedReason: "",
    peakAdvice: "",
    isAdmin: false,
    hasUnread: false,
    venuesLoading: true,
    venuesError: false,
    slotsLoading: false,
    slotsError: false,
  },

  onLoad() {
    // 零点击：一进入小程序即刻自动调起真实 GPS 定位并呈现真实地名
    if (!wx.getStorageSync("CURRENT_LOCATION")) this.autoFetchRealLocation();
  },

  onShow() {
    const cached = wx.getStorageSync("CURRENT_LOCATION");
    if (cached) {
      this.setData({ currentLocation: cached });
    }

    this.setData({
      isAdmin: AuthStore.isAdmin(),
    });
    this.loadData();
    if (AuthStore.getToken()) {
      NotificationService.getUnreadCount()
        .then((count) => this.setData({ hasUnread: count > 0 }))
        .catch(() => {});
    } else {
      this.setData({ hasUnread: false });
    }
  },

  /**
   * 全自动获取手机当前真实 GPS 位置，无需用户进行任何点击操作
   */
  autoFetchRealLocation() {
    wx.getLocation({
      type: "gcj02",
      success: (res) => {
        const { latitude, longitude } = res;
        const realLocationName = this.resolveRealLocation(latitude, longitude);
        this.setData({ currentLocation: realLocationName });
        wx.setStorageSync("CURRENT_LOCATION", realLocationName);
      },
      fail: (err) => {
        this.setData({
          currentLocation: wx.getStorageSync("CURRENT_LOCATION") || "选择位置",
        });
      },
    });
  },

  /**
   * 真实经纬度反查真实所在城市与区域文体中心地标
   */
  resolveRealLocation(lat: number, lng: number): string {
    return `当前位置 ${lat.toFixed(3)}, ${lng.toFixed(3)}`;
  },

  /**
   * 若用户想要手动更换其他场地，也可以点击直接唤起微信地图精准选点
   */
  handleChooseLocation() {
    wx.chooseLocation({
      success: (locRes) => {
        const realName = locRes.name || locRes.address || "已选场馆";
        this.setData({ currentLocation: realName });
        wx.setStorageSync("CURRENT_LOCATION", realName);
        wx.showToast({ title: `已定位: ${realName}`, icon: "success" });
      },
      fail: (err) => {
        console.log("取消地图选点:", err);
      },
    });
  },

  onPullDownRefresh() {
    this.autoFetchRealLocation();
    this.loadData().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 搜索框输入
   */
  onSearchInput(e: any) {
    this.setData({ keyword: e.detail.value });
  },

  onSearchFocus() {
    this.setData({ searchFocused: true });
  },

  onSearchBlur() {
    this.setData({ searchFocused: false });
  },

  /**
   * 触发搜索：携参切换到【场地】TabBar 页面并立即过滤
   */
  onSearchConfirm() {
    const kw = (this.data.keyword || "").trim();
    const app = getApp<any>();
    if (app && app.globalData) {
      app.globalData.targetVenueKeyword = kw;
    }
    // 切换到场地 Tab 页面
    wx.switchTab({
      url: "/pages/venue/list/list",
    });
  },

  async loadData() {
    this.setData({ venuesLoading: true, venuesError: false });
    try {
      const venues = await VenueService.getVenues();
      if (venues && venues.length > 0) {
        this.setData({
          venues,
          recommendedVenues: venues.slice(0, 3),
          venuesLoading: false,
        });
        // 保持当前选中的 venueId 或默认第 1 个
        const targetVenueId = venues.some(
          (v) => v.id === this.data.selectedVenueId,
        )
          ? this.data.selectedVenueId
          : venues[0].id;
        this.setData({ selectedVenueId: targetVenueId });
        await this.loadAvailabilityForVenue(targetVenueId);
      } else {
        this.setData({
          venues: [],
          quickSlots: [],
          selectedVenueId: "",
          venuesLoading: false,
        });
      }
    } catch (err: any) {
      console.warn("加载首页数据失败:", err);
      this.setData({
        venues: [],
        quickSlots: [],
        selectedVenueId: "",
        venuesLoading: false,
        venuesError: true,
        slotsError: false,
      });
    }
  },

  onRetryLoad() {
    this.loadData();
  },

  onRetrySlots() {
    if (this.data.selectedVenueId)
      this.loadAvailabilityForVenue(this.data.selectedVenueId);
  },

  /**
   * 用户自由切换今日时段余量对应的场馆
   */
  onSelectQuickVenue(e: any) {
    const id = e.currentTarget.dataset.id;
    this.setData({ selectedVenueId: id });
    this.loadAvailabilityForVenue(id);
  },

  /**
   * 加载指定场馆的时段余量
   */
  async loadAvailabilityForVenue(venueId: string) {
    this.setData({ slotsLoading: true, slotsError: false, quickSlots: [] });
    try {
      const avail = await VenueService.getAvailability(venueId);
      if (avail && this.data.selectedVenueId === venueId) {
        this.setData({
          quickSlots: (avail.slots || []).slice(0, 8),
          isClosedToday: avail.isClosed || false,
          closedReason: avail.closedReason || "",
          peakAdvice: avail.peakAdvice || "",
          slotsLoading: false,
        });
      } else if (this.data.selectedVenueId === venueId) {
        this.setData({ slotsLoading: false, slotsError: true });
      }
    } catch (err) {
      console.warn("加载指定场馆余量失败:", err);
      if (this.data.selectedVenueId === venueId) {
        this.setData({ slotsLoading: false, slotsError: true, quickSlots: [] });
      }
    }
  },

  goToVenueDetail(e: any) {
    const id = e.detail.id || e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/venue/detail/detail?id=${id}` });
  },

  goToBooking(e: any) {
    const id = e.detail.id || e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/venue/date/date?id=${encodeURIComponent(id)}`,
    });
  },

  onQuickSlotTap(e: any) {
    const slot = e.currentTarget.dataset.slot as VenueSlot;
    const targetVenueId = this.data.selectedVenueId;
    if (!slot || !targetVenueId) return;
    if (slot.isSelectable) {
      wx.navigateTo({
        url: `/pages/venue/booking/booking?id=${targetVenueId}&slotId=${slot.id}`,
      });
    } else {
      wx.showToast({ title: "该时段已约满或不可选", icon: "none" });
    }
  },

  goToNotifications() {
    wx.navigateTo({
      url: AuthStore.getToken()
        ? "/pages/user/notifications/notifications"
        : "/pages/auth/login/login",
    });
  },

  navTo(e: any) {
    const url = e.currentTarget.dataset.url;
    const type = e.currentTarget.dataset.type;
    if (url.startsWith("/pages/venue/list/list")) {
      const app = getApp<any>();
      if (app && app.globalData) {
        app.globalData.targetVenueType = type || "";
      }
      wx.switchTab({ url });
    } else if (
      url.startsWith("/pages/order/list/list") ||
      url.startsWith("/pages/user/profile/profile")
    ) {
      wx.switchTab({ url });
    } else {
      wx.navigateTo({ url });
    }
  },
});
