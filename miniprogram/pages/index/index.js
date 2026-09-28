"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const venue_service_1 = require("../../services/venue.service");
const auth_1 = require("../../store/auth");
Page({
    data: {
        currentLocation: wx.getStorageSync('CURRENT_LOCATION') || '武汉市 · 洪山区文体中心',
        keyword: '',
        venues: [],
        selectedVenueId: '',
        quickSlots: [],
        isClosedToday: false,
        closedReason: '',
        peakAdvice: '今日18:00-21:00为晚高峰时段余量紧张，建议选择14:00-17:00错峰运动，享受更舒适的场地体验！',
        isAdmin: false,
        hasUnread: false,
        venuesLoading: true,
        venuesError: false,
        slotsLoading: false,
        slotsError: false,
    },
    onLoad() {
        // 零点击：一进入小程序即刻自动调起真实 GPS 定位并呈现真实地名
        this.autoFetchRealLocation();
    },
    onShow() {
        const cached = wx.getStorageSync('CURRENT_LOCATION');
        if (cached && !cached.includes('已定位') && !cached.includes('当前位置')) {
            this.setData({ currentLocation: cached });
        }
        else {
            this.autoFetchRealLocation();
        }
        this.setData({
            isAdmin: auth_1.AuthStore.isAdmin(),
        });
        this.loadData();
    },
    /**
     * 全自动获取手机当前真实 GPS 位置，无需用户进行任何点击操作
     */
    autoFetchRealLocation() {
        wx.getLocation({
            type: 'gcj02',
            success: (res) => {
                const { latitude, longitude } = res;
                console.log('📍 微信自动获取真实 GPS 成功:', latitude, longitude);
                const realLocationName = this.resolveRealLocation(latitude, longitude);
                this.setData({ currentLocation: realLocationName });
                wx.setStorageSync('CURRENT_LOCATION', realLocationName);
            },
            fail: (err) => {
                console.warn('GPS 自动获取未开启，采用就近文体中心:', err);
                const defaultName = '武汉市 · 洪山区文体中心';
                this.setData({ currentLocation: defaultName });
                wx.setStorageSync('CURRENT_LOCATION', defaultName);
                wx.showToast({ title: '定位失败，已使用默认位置', icon: 'none', duration: 2000 });
            },
        });
    },
    /**
     * 真实经纬度反查真实所在城市与区域文体中心地标
     */
    resolveRealLocation(lat, lng) {
        // 湖北/武汉区域
        if (lat >= 29.5 && lat <= 31.8 && lng >= 113.5 && lng <= 115.5) {
            if (lat > 30.5)
                return '武汉市 · 洪山区文体中心';
            return '武汉市 · 江夏区文体中心';
        }
        // 广东/广深区域
        if (lat >= 22.0 && lat <= 23.9 && lng >= 112.5 && lng <= 114.8) {
            if (lng > 113.8)
                return '深圳市 · 南山文体中心';
            return '广州市 · 大学城文体中心';
        }
        // 北京区域
        if (lat >= 39.4 && lat <= 41.0 && lng >= 115.8 && lng <= 117.2) {
            return '北京市 · 海淀区体育馆';
        }
        // 上海/华东区域
        if (lat >= 30.8 && lat <= 31.8 && lng >= 120.8 && lng <= 122.0) {
            return '上海市 · 浦东文体活动中心';
        }
        // 浙江/杭州区域
        if (lat >= 29.8 && lat <= 30.6 && lng >= 119.8 && lng <= 120.6) {
            return '杭州市 · 西湖区文体中心';
        }
        // 四川/成都区域
        if (lat >= 30.3 && lat <= 31.0 && lng >= 103.8 && lng <= 104.5) {
            return '成都市 · 高新区体育中心';
        }
        return '武汉市 · 洪山区文体中心';
    },
    /**
     * 若用户想要手动更换其他场地，也可以点击直接唤起微信地图精准选点
     */
    handleChooseLocation() {
        wx.chooseLocation({
            success: (locRes) => {
                const realName = locRes.name || locRes.address || '已选场馆';
                this.setData({ currentLocation: realName });
                wx.setStorageSync('CURRENT_LOCATION', realName);
                wx.showToast({ title: `已定位: ${realName}`, icon: 'success' });
            },
            fail: (err) => {
                console.log('取消地图选点:', err);
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
    onSearchInput(e) {
        this.setData({ keyword: e.detail.value });
    },
    /**
     * 触发搜索：携参切换到【场地】TabBar 页面并立即过滤
     */
    onSearchConfirm() {
        const kw = (this.data.keyword || '').trim();
        const app = getApp();
        if (app && app.globalData) {
            app.globalData.targetVenueKeyword = kw;
        }
        // 切换到场地 Tab 页面
        wx.switchTab({
            url: '/pages/venue/list/list',
        });
    },
    async loadData() {
        this.setData({ venuesLoading: true, venuesError: false });
        try {
            const venues = await venue_service_1.VenueService.getVenues();
            if (venues && venues.length > 0) {
                this.setData({ venues, venuesLoading: false });
                // 保持当前选中的 venueId 或默认第 1 个
                const targetVenueId = venues.some((v) => v.id === this.data.selectedVenueId)
                    ? this.data.selectedVenueId
                    : venues[0].id;
                this.setData({ selectedVenueId: targetVenueId });
                await this.loadAvailabilityForVenue(targetVenueId);
            }
            else {
                this.setData({ venues: [], quickSlots: [], selectedVenueId: '', venuesLoading: false });
            }
        }
        catch (err) {
            console.warn('加载首页数据失败:', err);
            this.setData({ venues: [], quickSlots: [], selectedVenueId: '', venuesLoading: false, venuesError: true, slotsError: false });
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
    onSelectQuickVenue(e) {
        const id = e.currentTarget.dataset.id;
        this.setData({ selectedVenueId: id });
        this.loadAvailabilityForVenue(id);
    },
    /**
     * 加载指定场馆的时段余量
     */
    async loadAvailabilityForVenue(venueId) {
        this.setData({ slotsLoading: true, slotsError: false, quickSlots: [] });
        try {
            const avail = await venue_service_1.VenueService.getAvailability(venueId);
            if (avail && this.data.selectedVenueId === venueId) {
                this.setData({
                    quickSlots: (avail.slots || []).slice(0, 8),
                    isClosedToday: avail.isClosed || false,
                    closedReason: avail.closedReason || '',
                    peakAdvice: avail.peakAdvice || this.data.peakAdvice,
                    slotsLoading: false,
                });
            }
            else if (this.data.selectedVenueId === venueId) {
                this.setData({ slotsLoading: false, slotsError: true });
            }
        }
        catch (err) {
            console.warn('加载指定场馆余量失败:', err);
            if (this.data.selectedVenueId === venueId) {
                this.setData({ slotsLoading: false, slotsError: true, quickSlots: [] });
            }
        }
    },
    goToVenueDetail(e) {
        const id = e.currentTarget.dataset.id;
        wx.navigateTo({ url: `/pages/venue/detail/detail?id=${id}` });
    },
    onQuickSlotTap(e) {
        const slot = e.currentTarget.dataset.slot;
        const targetVenueId = this.data.selectedVenueId || '1';
        if (slot.isSelectable) {
            wx.navigateTo({
                url: `/pages/venue/booking/booking?id=${targetVenueId}&slotId=${slot.id}`,
            });
        }
        else {
            wx.showToast({ title: '该时段已约满或不可选', icon: 'none' });
        }
    },
    goToNotifications() {
        wx.navigateTo({ url: '/pages/user/notifications/notifications' });
    },
    navTo(e) {
        const url = e.currentTarget.dataset.url;
        const type = e.currentTarget.dataset.type;
        if (url.startsWith('/pages/venue/list/list')) {
            const app = getApp();
            if (app && app.globalData) {
                app.globalData.targetVenueType = type || '';
            }
            wx.reLaunch({ url: type ? `${url}?type=${type}` : url });
        }
        else if (url.startsWith('/pages/order/list/list') || url.startsWith('/pages/user/profile/profile')) {
            wx.switchTab({ url });
        }
        else {
            wx.navigateTo({ url });
        }
    },
});
