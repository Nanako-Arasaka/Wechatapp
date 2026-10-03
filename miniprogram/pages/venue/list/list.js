"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const venue_service_1 = require("../../../services/venue.service");
const format_1 = require("../../../utils/format");
const venue_filter_motion_1 = require("../../../utils/venue-filter-motion");
const auth_1 = require("../../../store/auth");
Page({
    data: {
        loading: true,
        loadingMore: false,
        page: 1,
        pageSize: 20,
        hasMore: true,
        total: 0,
        loadError: false,
        keyword: "",
        currentType: "",
        sortBy: "RECOMMEND",
        autoFocus: false,
        searchFocused: false,
        filterAnimating: false,
        cardStyles: {},
        listStyle: "",
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
    _loadId: 0,
    _filterMotion: null,
    onHide() {
        this.cancelFilter();
    },
    onUnload() {
        this.cancelFilter();
        this._loadId++;
    },
    cancelFilter() {
        this.filterAndSort();
    },
    getFilterMotion() {
        if (!this._filterMotion) {
            this._filterMotion = new venue_filter_motion_1.VenueFilterMotion({
                measure: (callback) => {
                    const query = this.createSelectorQuery();
                    query.select(".venue-cards-list").boundingClientRect();
                    query.selectAll(".venue-card-shell").fields({
                        dataset: true,
                        rect: true,
                        size: true,
                        computedStyle: ["opacity"],
                    });
                    query.exec((results) => {
                        const [bounds, cards] = results || [];
                        callback(bounds
                            ? { top: bounds.top, height: bounds.height, cards: cards || [] }
                            : null);
                    });
                },
                render: (values, callback) => this.setData(values, callback),
                schedule: (callback, ms) => setTimeout(callback, ms),
                unschedule: (timer) => clearTimeout(timer),
            });
        }
        return this._filterMotion;
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
        this._filterMotion?.cancel();
        this.setData({
            venueList: this.getFilteredVenues(sourceList),
            cardStyles: {},
            listStyle: "",
            filterAnimating: false,
        });
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
        this.setData({ loading: true, loadError: false, page: 1, hasMore: true });
        try {
            // 与 loadMoreVenues 保持一致：过滤条件统一传给后端，
            // 避免首次只拉第一页再前端过滤导致遗漏匹配场馆
            const res = await venue_service_1.VenueService.getVenues({
                page: 1,
                pageSize: this.data.pageSize,
                type: this.data.currentType || undefined,
                keyword: this.data.keyword || undefined,
                sortBy: this.data.sortBy,
            });
            if (loadId !== this._loadId)
                return;
            const list = res.list || [];
            const hasMore = list.length >= (res.pageSize || this.data.pageSize) && list.length < (res.total || list.length);
            this.setData({
                rawVenues: list,
                total: res.total || list.length,
                hasMore: list.length < (res.total || list.length),
                page: 1,
            });
            this.filterAndSort(list);
            void hasMore;
        }
        catch (err) {
            if (loadId !== this._loadId)
                return;
            console.warn("加载场地列表失败:", err);
            this.setData({ loadError: true, rawVenues: [], venueList: [], hasMore: false });
        }
        finally {
            if (loadId === this._loadId)
                this.setData({ loading: false });
        }
    },
    /** 触底加载下一页（G-5） */
    onReachBottom() {
        if (!this.data.hasMore || this.data.loading || this.data.loadingMore)
            return;
        this.loadMoreVenues();
    },
    async loadMoreVenues() {
        const nextPage = this.data.page + 1;
        this.setData({ loadingMore: true });
        try {
            const res = await venue_service_1.VenueService.getVenues({
                page: nextPage,
                pageSize: this.data.pageSize,
                type: this.data.currentType || undefined,
                keyword: this.data.keyword || undefined,
                sortBy: this.data.sortBy,
            });
            const add = res.list || [];
            const rawVenues = this.data.rawVenues.concat(add);
            this.setData({
                rawVenues,
                page: nextPage,
                hasMore: rawVenues.length < (res.total || rawVenues.length) && add.length > 0,
            });
            this.filterAndSort(rawVenues);
        }
        catch (err) {
            console.warn('加载更多场馆失败', err);
            this.setData({ hasMore: false });
        }
        finally {
            this.setData({ loadingMore: false });
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
        this.setData({ currentType: key });
        if (this.data.loading || this.data.loadError) {
            this.filterAndSort();
            return;
        }
        this.getFilterMotion().transition(this.data.venueList, this.getFilteredVenues(), key === "");
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
        const back = `/pages/venue/booking/booking?id=${encodeURIComponent(id)}`;
        if (!auth_1.AuthStore.getToken()) {
            // 未登录跳登录页并携带预约目标，登录成功自动回跳
            wx.navigateTo({
                url: `/pages/auth/login/login?redirect=${encodeURIComponent(back)}`,
            });
            return;
        }
        wx.navigateTo({ url: back });
    },
    noBubble() { },
});
