import { VenueService } from "../../../services/venue.service";
import { Venue } from "../../../types";
import { getVenueTypeName, safeDecode } from "../../../utils/format";

Page({
  data: {
    loading: true,
    loadError: false,
    keyword: "",
    currentType: "",
    sortBy: "RECOMMEND",
    autoFocus: false,
    searchFocused: false,
    filterLeaving: false,
    listEntering: true,
    cardStyles: {} as Record<string, string>,
    rawVenues: [] as Venue[],
    venueList: [] as Venue[],
    typeList: [
      { key: "", name: "全部", emoji: "🌟" },
      { key: "BADMINTON", name: "羽毛球", emoji: "🏸" },
      { key: "BASKETBALL", name: "篮球", emoji: "🏀" },
      { key: "TENNIS", name: "网球", emoji: "🎾" },
      { key: "TABLE_TENNIS", name: "乒乓球", emoji: "🏓" },
      { key: "FOOTBALL", name: "足球", emoji: "⚽" },
      { key: "SWIMMING", name: "游泳", emoji: "🏊" },
      { key: "FITNESS", name: "健身", emoji: "💪" },
      { key: "MULTI", name: "综合馆", emoji: "🏟️" },
    ],
  },
  _filterId: 0,
  _loadId: 0,
  _filterTimer: null as ReturnType<typeof setTimeout> | null,

  onHide() {
    this.cancelFilter();
  },
  onUnload() {
    this.cancelFilter();
    this._loadId++;
  },
  cancelFilter() {
    this._filterId++;
    if (this._filterTimer) clearTimeout(this._filterTimer);
    this.setData({ filterLeaving: false, cardStyles: {} });
  },
  onSearchFocus() {
    this.setData({ searchFocused: true });
  },
  onSearchBlur() {
    this.setData({ searchFocused: false });
  },

  onLoad(options: any) {
    if (options.autoFocus) {
      this.setData({ autoFocus: true });
    }
    if (options.type) {
      this.setData({ currentType: options.type });
    }
    if (options.keyword) {
      this.setData({ keyword: safeDecode(options.keyword) });
    }
  },

  onShow() {
    const app = getApp<any>();
    let changed = false;
    if (app && app.globalData) {
      if (
        app.globalData.targetVenueKeyword !== null &&
        app.globalData.targetVenueKeyword !== undefined
      ) {
        this.setData({ keyword: app.globalData.targetVenueKeyword });
        app.globalData.targetVenueKeyword = null;
        changed = true;
      }
      if (
        app.globalData.targetVenueType !== null &&
        app.globalData.targetVenueType !== undefined
      ) {
        this.setData({ currentType: app.globalData.targetVenueType });
        app.globalData.targetVenueType = null;
        changed = true;
      }
    }
    this.loadVenues();
    if (changed) {
      this.filterAndSort();
    }
  },

  onPullDownRefresh() {
    this.loadVenues().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  onRetry() {
    this.loadVenues();
  },

  filterAndSort(sourceList?: Venue[]) {
    let list = sourceList ? [...sourceList] : [...this.data.rawVenues];
    if (this.data.currentType) {
      list = list.filter((v) => v.type === this.data.currentType);
    }
    if (this.data.keyword) {
      const kw = this.data.keyword.trim().toLowerCase();
      list = list.filter((v) => {
        const nameMatch = v.name.toLowerCase().includes(kw);
        const descMatch = (v.description || "").toLowerCase().includes(kw);
        const addrMatch = (v.address || "").toLowerCase().includes(kw);
        const typeMatch = (v.type || "").toLowerCase().includes(kw);
        const typeNameMatch = getVenueTypeName(v.type || "")
          .toLowerCase()
          .includes(kw);
        const facMatch = (v.facilities || []).some((f) =>
          f.toLowerCase().includes(kw),
        );
        return (
          nameMatch ||
          descMatch ||
          addrMatch ||
          typeMatch ||
          typeNameMatch ||
          facMatch
        );
      });
    }
    this.applySorting(list);
  },

  async loadVenues() {
    this.cancelFilter();
    const loadId = ++this._loadId;
    this.setData({ loading: true, loadError: false });
    try {
      const res = await VenueService.getVenues();
      if (loadId !== this._loadId) return;
      const venues = Array.isArray(res) ? res : (res as any).list || [];
      this.setData({ rawVenues: venues, listEntering: true });
      this.filterAndSort(venues);
    } catch (err: any) {
      if (loadId !== this._loadId) return;
      console.warn("加载场地列表失败:", err);
      this.setData({ loadError: true, rawVenues: [], venueList: [] });
    } finally {
      if (loadId === this._loadId) this.setData({ loading: false });
    }
  },

  applySorting(venues: Venue[]) {
    let sorted = [...venues];
    if (this.data.sortBy === "RECOMMEND") {
      sorted.sort((a, b) => (b.recommendScore || 0) - (a.recommendScore || 0));
    } else if (this.data.sortBy === "PRICE_ASC") {
      sorted.sort((a, b) => a.basePrice - b.basePrice);
    } else if (this.data.sortBy === "REMAIN_DESC") {
      sorted.sort((a, b) => (b.totalRemaining || 0) - (a.totalRemaining || 0));
    }
    this.setData({ venueList: sorted });
  },

  onKeywordInput(e: any) {
    this.cancelFilter();
    this.setData({ listEntering: false });
    this.setData({ keyword: e.detail.value });
    this.filterAndSort();
  },

  onSearchConfirm() {
    this.filterAndSort();
  },

  onClearKeyword() {
    this.cancelFilter();
    this.setData({ keyword: "" });
    this.filterAndSort();
  },

  onSelectType(e: any) {
    const key = e.currentTarget.dataset.key;
    if (key === this.data.currentType) return;
    this.cancelFilter();
    const filterId = this._filterId;
    this.setData({ currentType: key });
    // 先记录位置，再用新列表的位置差还原浏览器版筛选位移动画。
    this.createSelectorQuery()
      .selectAll(".venue-card-shell")
      .boundingClientRect((rects: any[]) => {
        if (filterId !== this._filterId) return;
        const before = new Map(
          (rects || []).map((rect) => [rect.dataset.id, rect.top]),
        );
        this.setData({ filterLeaving: true, listEntering: false });
        this._filterTimer = setTimeout(() => {
          if (filterId !== this._filterId) return;
          this.filterAndSort();
          this.setData({ filterLeaving: false }, () => {
            this.createSelectorQuery()
              .selectAll(".venue-card-shell")
              .boundingClientRect((after: any[]) => {
                if (filterId !== this._filterId) return;
                const cardStyles: Record<string, string> = {};
                (after || []).forEach((rect) => {
                  const oldTop = before.get(rect.dataset.id);
                  cardStyles[rect.dataset.id] =
                    oldTop === undefined
                      ? "opacity:0;transition:none;"
                      : `transform:translateY(${Number(oldTop) - rect.top}px);transition:none;`;
                });
                this.setData({ cardStyles }, () => {
                  this._filterTimer = setTimeout(() => {
                    if (filterId !== this._filterId) return;
                    const settled: Record<string, string> = {};
                    Object.keys(cardStyles).forEach((id) => {
                      settled[id] =
                        "transform:translateY(0);opacity:1;transition:transform 520ms cubic-bezier(.22,1,.36,1),opacity 420ms ease;";
                    });
                    this.setData({ cardStyles: settled });
                  }, 32);
                });
              })
              .exec();
          });
        }, 240);
      })
      .exec();
  },

  onSelectSort(e: any) {
    this.cancelFilter();
    const sortBy = e.currentTarget.dataset.sort;
    this.setData({ sortBy });
    this.filterAndSort();
  },

  onResetFilter() {
    this.cancelFilter();
    this.setData({ keyword: "", currentType: "", sortBy: "RECOMMEND" });
    this.filterAndSort();
  },

  goToDetail(e: any) {
    const id = e.detail.id || e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/venue/detail/detail?id=${id}` });
  },

  goToBooking(e: any) {
    const id = e.detail.id || e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/venue/date/date?id=${encodeURIComponent(id)}`,
    });
  },

  noBubble() {},
});
