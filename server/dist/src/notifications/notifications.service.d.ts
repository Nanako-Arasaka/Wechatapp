import { PrismaService } from '../common/prisma/prisma.service';
export declare class NotificationsService {
    private prisma;
    constructor(prisma: PrismaService);
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
