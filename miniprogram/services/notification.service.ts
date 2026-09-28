import { request } from './request';

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

/**
 * 站内消息通知服务（对接后端 /notifications 接口）
 */
export class NotificationService {
  /** 通知列表 */
  static async getNotifications(): Promise<NotificationItem[]> {
    return request<NotificationItem[]>('/notifications', 'GET', undefined, { showErrorToast: false });
  }

  /** 未读通知数（消息角标） */
  static async getUnreadCount(): Promise<number> {
    const res = await request<{ count: number }>('/notifications/unread-count', 'GET', undefined, {
      showErrorToast: false,
    });
    return res?.count || 0;
  }

  /** 标记单条已读 */
  static async markRead(id: string): Promise<void> {
    await request(`/notifications/${id}/read`, 'POST', undefined, { showErrorToast: false });
  }

  /** 全部标记已读 */
  static async markAllRead(): Promise<void> {
    await request('/notifications/read-all', 'POST', undefined, { showErrorToast: false });
  }
}
