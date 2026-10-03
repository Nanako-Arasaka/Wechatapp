import { VenueService } from "../../../services/venue.service";
import { Venue } from "../../../types";
import { getVenueTypeName } from "../../../utils/format";
import { venueImage } from "../../../utils/venue-image";
import { AuthStore } from "../../../store/auth";

/**
 * ============================================================================
 * P1 场地概况页 (VenueDetailPage)
 * ----------------------------------------------------------------------------
 * 用户目标：查看场馆基础信息，判断是否预约。
 * 核心交互逻辑：
 * 1. 顶部「羽毛球馆 / 网球馆」切换选项卡：
 *    调用 GET /venues 拉取全部场馆，按类型过滤后取首个场馆渲染。
 * 2. 展示馆名、场馆开放时间、馆内平面示意图（CSS 绘制）、场馆位置说明。
 * 3. 点击【开始预约】路由跳转至 P2 选择时间页（venue/booking）。
 * 4. 兼容外部入口：支持 ?id= 直达指定场馆（首页/场地列表页跳转场景）。
 * ============================================================================
 */
Page({
  data: {
    // 顶部切换选项卡配置（羽毛球馆 / 网球馆）
    tabs: [] as Array<{ key: string; label: string }>,
    activeTab: "BADMINTON", // 当前选中的选项卡类型
    venues: [] as Venue[], // GET /venues 返回的全部场馆
    venue: {} as Venue, // 当前展示的场馆
    // 馆内平面示意图：根据场馆容量生成场地格（1号场、2号场...）
    courtBlocks: [] as Array<{ no: number }>,
    loading: true,
    loadError: false, // 加载失败标记（错误占位 + 重试）
    presetId: "",
    coverImage: "",
  },

  onLoad(options: any) {
    this.setData({ presetId: options?.id || "" });
    // 兼容外部 ?id= 直达：携带 id 时优先展示该场馆
    if (options && options.id) {
      this.loadVenues(options.id);
    } else {
      // 默认展示羽毛球馆
      this.loadVenues();
    }
  },

  /**
   * 加载场馆列表并初始化当前展示的场馆
   * @param presetId 外部传入的场馆 ID（可选，用于 ?id= 直达）
   */
  async loadVenues(presetId?: string) {
    try {
      this.setData({ loading: true, loadError: false });
      // 调用已有接口 GET /venues 获取场馆基础信息
      const venuesRes = await VenueService.getVenues();
      const venues = venuesRes.list || [];
      const activeList = venues.filter((v) => v.status !== "INACTIVE");
      const tabs = activeList.reduce(
        (items: Array<{ key: string; label: string }>, item) => {
          if (!items.some((tab) => tab.key === item.type)) {
            items.push({ key: item.type, label: getVenueTypeName(item.type) });
          }
          return items;
        },
        [],
      );

      let venue: Venue | undefined;
      let activeTab = this.data.activeTab;

      if (presetId) {
        // 外部直达：按 id 匹配场馆，并同步选项卡到其类型
        venue = activeList.find((v) => v.id === presetId);
        if (venue) {
          activeTab = venue.type;
        }
      }

      // 未匹配到直达场馆时，按当前选项卡类型取首个场馆
      if (!venue) {
        venue = activeList.find((v) => v.type === activeTab) || activeList[0];
      }

      if (venue) {
        this.applyVenue(venue, activeTab);
      }

      this.setData({
        venues: activeList,
        tabs,
        activeTab: venue?.type || activeTab,
        venue: venue || ({} as Venue),
      });
    } catch (err) {
      console.error("加载场馆列表失败:", err);
      this.setData({ loadError: true, venue: {} as Venue, courtBlocks: [] });
    } finally {
      this.setData({ loading: false });
    }
  },

  onImageError() {
    this.setData({ coverImage: "/assets/ui/venue.svg" });
  },

  onRetry() {
    this.loadVenues(this.data.venue.id || this.data.presetId || undefined);
  },

  onPullDownRefresh() {
    this.loadVenues(
      this.data.venue.id || this.data.presetId || undefined,
    ).finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 将场馆数据渲染到页面（含平面示意图场地格生成）
   */
  applyVenue(venue: Venue, activeTab: string) {
    const capacity = Math.max(0, Math.floor(venue.capacity || 0));
    const courtBlocks = [];
    for (let i = 1; i <= capacity; i++) {
      courtBlocks.push({ no: i });
    }

    this.setData({
      venue,
      coverImage: venueImage(venue.coverImage),
      courtBlocks,
      activeTab,
      presetId: venue.id,
    });

    // 同步导航栏标题为馆名
    wx.setNavigationBarTitle({ title: venue.name });
  },

  /**
   * 切换「羽毛球馆 / 网球馆」选项卡
   */
  onSwitchTab(e: any) {
    const key = e.currentTarget.dataset.key as string;
    if (key === this.data.activeTab) {
      return; // 重复点击当前选项卡，不做处理
    }

    // 在已加载的场馆列表中按类型过滤出目标场馆
    const venue = this.data.venues.find((v) => v.type === key);
    if (venue) {
      this.applyVenue(venue, key);
    } else {
      wx.showToast({ title: "暂无该类型场馆", icon: "none" });
    }
  },

  /**
   * 点击【开始预约】：路由跳转至 P2 选择时间页
   */
  goToBooking() {
    if (!this.data.venue.id) {
      wx.showToast({ title: "场馆信息加载中，请稍候", icon: "none" });
      return;
    }
    const back = `/pages/venue/booking/booking?id=${encodeURIComponent(this.data.venue.id)}`;
    if (!AuthStore.getToken()) {
      // 未登录跳登录页并携带预约目标，登录成功自动回跳
      wx.navigateTo({
        url: `/pages/auth/login/login?redirect=${encodeURIComponent(back)}`,
      });
      return;
    }
    wx.navigateTo({ url: back });
  },
});
