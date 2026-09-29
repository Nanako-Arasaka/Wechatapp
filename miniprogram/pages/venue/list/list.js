"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const venue_service_1 = require("../../../services/venue.service");
const format_1 = require("../../../utils/format");
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
        rawVenues: [],
        venueList: [],
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
    _filterTimer: null,
    onHide() {
        this.cancelFilter();
    },
    onUnload() {
        this.cancelFilter();
        this._loadId++;
    },
    cancelFilter(resetView = true) {
        this._filterId++;
        if (this._filterTimer !== null)
            clearTimeout(this._filterTimer);
        this._filterTimer = null;
        if (resetView)
            this.setData({ filterLeaving: false });
    },
    onSearchFocus() {
        this.setData({ searchFocused: true });
    },
    onSearchBlur() {
        this.setData({ searchFocused: false });
    },
    onLoad(options) {
        if (options.autoFocus) {
            this.setData({ autoFocus: true });
        }
        if (options.type) {
            this.setData({ currentType: options.type });
        }
        if (options.keyword) {
            this.setData({ keyword: (0, format_1.safeDecode)(options.keyword) });
        }
    },
    onShow() {
        const app = getApp();
        let changed = false;
        if (app && app.globalData) {
            if (app.globalData.targetVenueKeyword !== null &&
                app.globalData.targetVenueKeyword !== undefined) {
                this.setData({ keyword: app.globalData.targetVenueKeyword });
                app.globalData.targetVenueKeyword = null;
                changed = true;
            }
            if (app.globalData.targetVenueType !== null &&
                app.globalData.targetVenueType !== undefined) {
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
    filterAndSort(sourceList) {
        this.setData({ venueList: this.getFilteredVenues(sourceList) });
    },
    getFilteredVenues(sourceList) {
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
                const typeNameMatch = (0, format_1.getVenueTypeName)(v.type || "")
                    .toLowerCase()
                    .includes(kw);
                const facMatch = (v.facilities || []).some((f) => f.toLowerCase().includes(kw));
                return (nameMatch ||
                    descMatch ||
                    addrMatch ||
                    typeMatch ||
                    typeNameMatch ||
                    facMatch);
            });
        }
        return this.applySorting(list);
    },
    async loadVenues() {
        this.cancelFilter();
        const loadId = ++this._loadId;
        this.setData({ loading: true, loadError: false });
        try {
            const res = await venue_service_1.VenueService.getVenues();
            if (loadId !== this._loadId)
                return;
            const venues = Array.isArray(res) ? res : res.list || [];
            this.setData({ rawVenues: venues });
            this.filterAndSort(venues);
        }
        catch (err) {
            if (loadId !== this._loadId)
                return;
            console.warn("加载场地列表失败:", err);
            this.setData({ loadError: true, rawVenues: [], venueList: [] });
        }
        finally {
            if (loadId === this._loadId)
                this.setData({ loading: false });
        }
    },
    applySorting(venues) {
        let sorted = [...venues];
        if (this.data.sortBy === "RECOMMEND") {
            sorted.sort((a, b) => (b.recommendScore || 0) - (a.recommendScore || 0));
        }
        else if (this.data.sortBy === "PRICE_ASC") {
            sorted.sort((a, b) => a.basePrice - b.basePrice);
        }
        else if (this.data.sortBy === "REMAIN_DESC") {
            sorted.sort((a, b) => (b.totalRemaining || 0) - (a.totalRemaining || 0));
        }
        return sorted;
    },
    onKeywordInput(e) {
        this.cancelFilter();
        this.setData({ keyword: e.detail.value });
        this.filterAndSort();
    },
    onSearchConfirm() {
        this.cancelFilter();
        this.filterAndSort();
    },
    onClearKeyword() {
        this.cancelFilter();
        this.setData({ keyword: "" });
        this.filterAndSort();
    },
    onSelectType(e) {
        const key = e.currentTarget.dataset.key;
        if (key === this.data.currentType)
            return;
        this.cancelFilter(false);
        const filterId = this._filterId;
        if (this.data.loading || this.data.loadError) {
            this.setData({ currentType: key, filterLeaving: false });
            this.filterAndSort();
            return;
        }
        // 只移动结果容器，避免卡片入场、列表退场和 FLIP 同时修改 transform。
        // 从视图更新完成后开始计时；连续切换时保留当前退场状态。
        this.setData({ currentType: key, filterLeaving: true }, () => {
            if (filterId !== this._filterId)
                return;
            this._filterTimer = setTimeout(() => {
                if (filterId !== this._filterId)
                    return;
                this._filterTimer = null;
                this.setData({
                    venueList: this.getFilteredVenues(),
                    filterLeaving: false,
                });
            }, 140);
        });
    },
    onSelectSort(e) {
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
    goToDetail(e) {
        const id = e.detail.id || e.currentTarget.dataset.id;
        wx.navigateTo({ url: `/pages/venue/detail/detail?id=${id}` });
    },
    goToBooking(e) {
        const id = e.detail.id || e.currentTarget.dataset.id;
        wx.navigateTo({
            url: `/pages/venue/date/date?id=${encodeURIComponent(id)}`,
        });
    },
    noBubble() { },
});
