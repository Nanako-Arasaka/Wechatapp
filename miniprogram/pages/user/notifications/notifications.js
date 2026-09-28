"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const notification_service_1 = require("../../../services/notification.service");
const auth_1 = require("../../../store/auth");
/** 将 ISO 时间格式化为相对时间 */
function formatRelativeTime(iso) {
    if (!iso)
        return '';
    const time = new Date(iso).getTime();
    if (!Number.isFinite(time))
        return '';
    const diff = Date.now() - time;
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    if (diff < minute)
        return '刚刚';
    if (diff < hour)
        return `${Math.floor(diff / minute)}分钟前`;
    if (diff < day)
        return `${Math.floor(diff / hour)}小时前`;
    if (diff < 2 * day)
        return '昨天';
    if (diff < 7 * day)
        return `${Math.floor(diff / day)}天前`;
    const d = new Date(time);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
}
Page({
    data: {
        loading: true,
        loadError: false,
        isLoggedIn: false,
        notifications: [],
    },
    onShow() {
        this.loadNotifications();
    },
    onPullDownRefresh() {
        this.loadNotifications().finally(() => wx.stopPullDownRefresh());
    },
    async loadNotifications() {
        const isLoggedIn = !!auth_1.AuthStore.getToken();
        this.setData({ isLoggedIn });
        if (!isLoggedIn) {
            this.setData({ loading: false, loadError: false, notifications: [] });
            return;
        }
        this.setData({ loading: true, loadError: false });
        try {
            const list = await notification_service_1.NotificationService.getNotifications();
            this.setData({
                loading: false,
                notifications: (list || []).map((n) => ({
                    ...n,
                    time: formatRelativeTime(n.createdAt),
                })),
            });
            // 打开通知中心后自动全部标记为已读（角标清零）
            if ((list || []).some((n) => !n.isRead)) {
                notification_service_1.NotificationService.markAllRead().then(() => {
                    this.setData({ notifications: this.data.notifications.map((notification) => ({ ...notification, isRead: true })) });
                }).catch(() => { });
            }
        }
        catch (err) {
            console.warn('加载通知失败:', err);
            this.setData({ loading: false, loadError: true });
        }
    },
    onRetry() {
        this.loadNotifications();
    },
    goToLogin() {
        wx.navigateTo({ url: '/pages/auth/login/login' });
    },
});
