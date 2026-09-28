import { VenueService } from '../../../services/venue.service';
import { Venue } from '../../../types';
import { getVenueTypeName } from '../../../utils/format';

Page({
  data: {
    loading: true,
    loadError: false,
    keyword: '',
    currentType: '',
    sortBy: 'RECOMMEND',
    autoFocus: false,
    rawVenues: [] as Venue[],
    venueList: [] as Venue[],
    typeList: [
      { key: '', name: '全部', emoji: '🌟' },
      { key: 'BADMINTON', name: '羽毛球', emoji: '🏸' },
      { key: 'BASKETBALL', name: '篮球', emoji: '🏀' },
      { key: 'TENNIS', name: '网球', emoji: '🎾' },
      { key: 'TABLE_TENNIS', name: '乒乓球', emoji: '🏓' },
      { key: 'FOOTBALL', name: '足球', emoji: '⚽' },
      { key: 'SWIMMING', name: '游泳', emoji: '🏊' },
      { key: 'FITNESS', name: '健身', emoji: '💪' },
      { key: 'MULTI', name: '综合馆', emoji: '🏟️' },
    ],
  },

  onLoad(options: any) {
    if (options.autoFocus) {
      this.setData({ autoFocus: true });
    }
    if (options.type) {
      this.setData({ currentType: options.type });
    }
    if (options.keyword) {
      this.setData({ keyword: decodeURIComponent(options.keyword) });
    }
  },

  onShow() {
    const app = getApp<any>();
    let changed = false;
    if (app && app.globalData) {
      if (app.globalData.targetVenueKeyword) {
        this.setData({ keyword: app.globalData.targetVenueKeyword });
        app.globalData.targetVenueKeyword = null;
        changed = true;
      }
      if (app.globalData.targetVenueType) {
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
        const descMatch = (v.description || '').toLowerCase().includes(kw);
        const addrMatch = (v.address || '').toLowerCase().includes(kw);
        const typeMatch = (v.type || '').toLowerCase().includes(kw);
        const typeNameMatch = getVenueTypeName(v.type || '').toLowerCase().includes(kw);
        const facMatch = (v.facilities || []).some((f) => f.toLowerCase().includes(kw));
        return nameMatch || descMatch || addrMatch || typeMatch || typeNameMatch || facMatch;
      });
    }
    this.applySorting(list);
  },

  async loadVenues() {
    this.setData({ loading: true, loadError: false });
    try {
      const res = await VenueService.getVenues({
        keyword: this.data.keyword || undefined,
        type: this.data.currentType || undefined,
        sortBy: this.data.sortBy === 'RECOMMEND' ? undefined : this.data.sortBy.toLowerCase(),
      });
      const venues = Array.isArray(res) ? res : (((res as any).list) || []);
      this.setData({ rawVenues: venues });
      this.filterAndSort(venues);
    } catch (err: any) {
      console.warn('加载场地列表失败:', err);
      this.setData({ loadError: true, rawVenues: [], venueList: [] });
    } finally {
      this.setData({ loading: false });
    }
  },

  applySorting(venues: Venue[]) {
    let sorted = [...venues];
    if (this.data.sortBy === 'RECOMMEND') {
      sorted.sort((a, b) => (b.recommendScore || 0) - (a.recommendScore || 0));
    } else if (this.data.sortBy === 'PRICE_ASC') {
      sorted.sort((a, b) => a.basePrice - b.basePrice);
    } else if (this.data.sortBy === 'REMAIN_DESC') {
      sorted.sort((a, b) => (b.totalRemaining || 0) - (a.totalRemaining || 0));
    }
    this.setData({ venueList: sorted });
  },

  onKeywordInput(e: any) {
    this.setData({ keyword: e.detail.value });
    this.filterAndSort();
  },

  onSearchConfirm() {
    this.filterAndSort();
  },

  onClearKeyword() {
    this.setData({ keyword: '' });
    this.filterAndSort();
  },

  onSelectType(e: any) {
    const key = e.currentTarget.dataset.key;
    this.setData({ currentType: key });
    this.filterAndSort();
  },

  onSelectSort(e: any) {
    const sortBy = e.currentTarget.dataset.sort;
    this.setData({ sortBy });
    this.filterAndSort();
  },

  onResetFilter() {
    this.setData({ keyword: '', currentType: '', sortBy: 'RECOMMEND' });
    this.filterAndSort();
  },

  goToDetail(e: any) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/venue/detail/detail?id=${id}` });
  },

  goToBooking(e: any) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/venue/booking/booking?id=${id}` });
  },

  noBubble() {},
});
