import { NotificationService, NotificationItem } from '../../../services/notification.service';

interface NotificationView extends NotificationItem {
  time: string;
}

/** 将 ISO 时间格式化为相对时间 */
function formatRelativeTime(iso: string): string {
  if (!iso) return '';
  const time = new Date(iso).getTime();
  const diff = Date.now() - time;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return '刚刚';
  if (diff < hour) return `${Math.floor(diff / minute)}分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)}小时前`;
  if (diff < 2 * day) return '昨天';
  if (diff < 7 * day) return `${Math.floor(diff / day)}天前`;
  const d = new Date(time);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

Page({
  data: {
    loading: true,
    loadError: false,
    notifications: [] as NotificationView[],
  },

  onShow() {
    this.loadNotifications();
  },

  onPullDownRefresh() {
    this.loadNotifications().finally(() => wx.stopPullDownRefresh());
  },

  async loadNotifications() {
    this.setData({ loading: true, loadError: false });
    try {
      const list = await NotificationService.getNotifications();
      this.setData({
        loading: false,
        notifications: (list || []).map((n) => ({
          ...n,
          time: formatRelativeTime(n.createdAt),
        })),
      });
      // 打开通知中心后自动全部标记为已读（角标清零）
      if ((list || []).some((n) => !n.isRead)) {
        NotificationService.markAllRead().catch(() => {});
      }
    } catch (err) {
      console.warn('加载通知失败:', err);
      this.setData({ loading: false, loadError: true });
    }
  },

  onRetry() {
    this.loadNotifications();
  },
});
