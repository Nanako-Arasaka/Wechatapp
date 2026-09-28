"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const request_1 = require("./request");
/**
 * 站内消息通知服务（对接后端 /notifications 接口）
 */
class NotificationService {
    /** 通知列表 */
    static async getNotifications() {
        return (0, request_1.request)('/notifications', 'GET', undefined, { showErrorToast: false });
    }
    /** 未读通知数（消息角标） */
    static async getUnreadCount() {
        const res = await (0, request_1.request)('/notifications/unread-count', 'GET', undefined, {
            showErrorToast: false,
        });
        return res?.count || 0;
    }
    /** 标记单条已读 */
    static async markRead(id) {
        await (0, request_1.request)(`/notifications/${id}/read`, 'POST', undefined, { showErrorToast: false });
    }
    /** 全部标记已读 */
    static async markAllRead() {
        await (0, request_1.request)('/notifications/read-all', 'POST', undefined, { showErrorToast: false });
    }
}
exports.NotificationService = NotificationService;
