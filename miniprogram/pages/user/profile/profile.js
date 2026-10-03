"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auth_1 = require("../../../store/auth");
const auth_service_1 = require("../../../services/auth.service");
const order_service_1 = require("../../../services/order.service");
const notification_service_1 = require("../../../services/notification.service");
Page({
    data: {
        isLoggedIn: false,
        user: null,
        isAdmin: false,
        isSuperAdmin: false,
        statsLoaded: false,
        confirmedCount: 0,
        pendingPayCount: 0,
        completedCount: 0,
        totalBookingsCount: 0,
        exerciseHours: 0,
        unreadCount: 0,
        maskedPhone: "未绑定手机号",
        avatarUrl: "/assets/ui/user.svg",
    },
    onShow() {
        this.refreshUserInfo();
        if (this.data.isLoggedIn) {
            this.setData({ statsLoaded: false });
            this.loadStats();
            this.loadUnreadCount();
        }
        else {
            this.setData({
                statsLoaded: true,
                confirmedCount: 0,
                pendingPayCount: 0,
                completedCount: 0,
                totalBookingsCount: 0,
                exerciseHours: 0,
                unreadCount: 0,
            });
        }
    },
    onPullDownRefresh() {
        this.refreshUserInfo();
        if (!this.data.isLoggedIn) {
            wx.stopPullDownRefresh();
            return;
        }
        Promise.all([this.loadStats(), this.loadUnreadCount()]).finally(() => {
            wx.stopPullDownRefresh();
        });
    },
    onAvatarError() {
        this.setData({ avatarUrl: "/assets/ui/user.svg" });
    },
    async refreshUserInfo() {
        let user = auth_1.AuthStore.getUser();
        if (user && auth_1.AuthStore.getToken()) {
            // 每次显示个人中心时从服务端刷新一次资料，避免本地缓存昵称/头像过期或乱码
            try {
                const fresh = await auth_service_1.AuthService.getProfile();
                auth_1.AuthStore.setUser(fresh);
                user = fresh;
            }
            catch (err) {
                console.warn("刷新个人资料失败，使用本地缓存:", err);
            }
            const phone = user.phone || "未绑定手机号";
            const maskedPhone = phone.length === 11
                ? `${phone.substring(0, 3)} **** ${phone.substring(7)}`
                : phone;
            this.setData({
                isLoggedIn: true,
                user,
                avatarUrl: user.avatar || "/assets/ui/user.svg",
                maskedPhone,
                isAdmin: auth_1.AuthStore.isAdmin(),
                isSuperAdmin: auth_1.AuthStore.isSuperAdmin(),
            });
        }
        else {
            this.setData({
                isLoggedIn: false,
                user: null,
                avatarUrl: "/assets/ui/user.svg",
                maskedPhone: "请登录后查看",
                isAdmin: false,
                isSuperAdmin: false,
            });
        }
    },
    async loadStats() {
        try {
            const orders = await order_service_1.OrderService.getOrders();
            const confirmed = orders.filter((o) => o.bookingStatus === "CONFIRMED").length;
            const pendingPay = orders.filter((o) => o.bookingStatus === "PENDING_PAYMENT").length;
            const completed = orders.filter((o) => o.bookingStatus === "COMPLETED" || o.bookingStatus === "CHECKED_IN").length;
            const totalBookedHours = orders
                .filter((o) => ["CONFIRMED", "CHECKED_IN", "COMPLETED"].includes(o.bookingStatus))
                .reduce((sum, o) => {
                const [sh, sm] = o.startTime.split(":").map(Number);
                const [eh, em] = o.endTime.split(":").map(Number);
                return sum + (eh * 60 + em - sh * 60 - sm) / 60;
            }, 0);
            this.setData({
                confirmedCount: confirmed,
                pendingPayCount: pendingPay,
                completedCount: completed,
                totalBookingsCount: orders.length,
                exerciseHours: Math.round(totalBookedHours * 10) / 10,
                statsLoaded: true,
            });
        }
        catch (err) {
            console.warn("统计数据加载异常:", err);
            this.setData({ statsLoaded: false });
        }
    },
    /**
     * 加载消息通知真实未读数（失败时静默清零，不影响页面）
     */
    async loadUnreadCount() {
        try {
            const count = await notification_service_1.NotificationService.getUnreadCount();
            this.setData({ unreadCount: count });
        }
        catch (err) {
            console.warn("未读数加载失败:", err);
        }
    },
    goToOrders() {
        if (!this.data.isLoggedIn) {
            this.goToLogin();
            return;
        }
        const app = getApp();
        if (app && app.globalData) {
            app.globalData.targetOrderStatus = "ALL";
        }
        wx.switchTab({ url: "/pages/order/list/list" });
    },
    /**
     * 4 宫格点击：通过全局状态将 targetOrderStatus 传给订单 Tab 页
     */
    goToOrdersWithStatus(e) {
        if (!this.data.isLoggedIn) {
            this.goToLogin();
            return;
        }
        const status = e.currentTarget.dataset.status;
        const app = getApp();
        if (app && app.globalData) {
            app.globalData.targetOrderStatus = status;
        }
        wx.switchTab({ url: "/pages/order/list/list" });
    },
    goToLogin() {
        wx.navigateTo({ url: "/pages/auth/login/login" });
    },
    goToNotifications() {
        if (!this.data.isLoggedIn)
            return this.goToLogin();
        wx.navigateTo({ url: "/pages/user/notifications/notifications" });
    },
    /** 返回管理端首页（场馆管理落地页） */
    goAdminHome() {
        if (!this.data.isAdmin) {
            this.goToLogin();
            return;
        }
        wx.reLaunch({ url: "/pages/admin/home/home" });
    },
    navTo(e) {
        if (!this.data.isLoggedIn) {
            this.goToLogin();
            return;
        }
        const url = e.currentTarget.dataset.url;
        const tabs = [
            "/pages/index/index",
            "/pages/venue/list/list",
            "/pages/order/list/list",
            "/pages/user/profile/profile",
        ];
        if (tabs.includes(url))
            wx.switchTab({ url });
        else
            wx.navigateTo({ url });
    },
    showAbout() {
        wx.showModal({
            title: "Slotify (智场通) 场地预约",
            content: "查看场馆排期、预约场地和管理入场凭证。\r\n\r\n版本号：v1.0.0",
            showCancel: false,
            confirmText: "了解",
            confirmColor: "#1677FF",
        });
    },
    showFeedback() {
        wx.showModal({
            title: "意见反馈",
            content: "请联系所在场馆管理中心或前台工作人员反馈预约问题。",
            showCancel: false,
        });
    },
    handleLogout() {
        wx.showModal({
            title: "确认退出登录",
            content: "退出后将返回未登录状态。",
            success: async (res) => {
                if (res.confirm) {
                    try {
                        await auth_service_1.AuthService.logout();
                    }
                    catch (err) {
                        console.warn('logout API 失败，仍清理本地会话', err);
                    }
                    const app = getApp();
                    if (app && app.globalData) {
                        app.globalData.userInfo = null;
                        app.globalData.isLoggedIn = false;
                    }
                    this.refreshUserInfo();
                    this.setData({
                        confirmedCount: 0,
                        pendingPayCount: 0,
                        completedCount: 0,
                        totalBookingsCount: 0,
                        exerciseHours: 0,
                        unreadCount: 0,
                        statsLoaded: true,
                    });
                    wx.showToast({ title: "已退出登录", icon: "none" });
                    setTimeout(() => {
                        wx.navigateTo({ url: "/pages/auth/login/login" });
                    }, 800);
                }
            },
        });
    },
});
