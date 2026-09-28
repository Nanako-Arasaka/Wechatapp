import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

/**
 * 站内消息通知服务
 * 提供当前用户的通知列表、未读数统计与已读标记能力。
 */
@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  /**
   * 当前用户通知列表（按时间倒序，最多 50 条）
   */
  async findAll(userId: string) {
    const list = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return list.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      content: n.content,
      isRead: n.isRead,
      createdAt: n.createdAt,
    }));
  }

  /**
   * 当前用户未读通知数（用于消息角标）
   */
  async unreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  /**
   * 标记单条为已读（仅限本人通知）
   */
  async markRead(id: string, userId: string) {
    await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
    return { success: true };
  }

  /**
   * 全部标记为已读
   */
  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { success: true, updated: result.count };
  }
}
