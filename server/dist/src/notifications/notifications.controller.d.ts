import { NotificationsService } from './notifications.service';
export declare class NotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    findAll(userId: string): Promise<{
        id: string;
        type: string;
        title: string;
        content: string;
        isRead: boolean;
        createdAt: Date;
    }[]>;
    unreadCount(userId: string): Promise<{
        count: number;
    }>;
    markRead(id: string, userId: string): Promise<{
        success: boolean;
    }>;
    markAllRead(userId: string): Promise<{
        success: boolean;
        updated: number;
    }>;
}
