import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { SlotStatus } from '../common/enums';
import { BusinessException, BusinessErrorCode } from '../common/exceptions/business.exception';
import * as dayjs from 'dayjs';

@Injectable()
export class DevService {
  private readonly logger = new Logger(DevService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 定时任务：每分钟自动过期超时的待支付订单并释放库存
   * （普通用户 15 分钟未支付自动关闭，无需管理员手动触发）
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleExpiredOrdersCron() {
    try {
      const result = await this.expirePendingOrders();
      if (result.expiredCount > 0) {
        this.logger.log(`[定时任务] 自动过期 ${result.expiredCount} 笔超时待支付订单`);
      }
    } catch (err) {
      this.logger.error('[定时任务] 过期订单处理失败', err as any);
    }
  }

  /**
   * 自动过期超时的待支付订单并释放库存（原子状态扭转，幂等可重入）
   */
  async expirePendingOrders() {
    const now = new Date();
    const expiredBookings = await this.prisma.booking.findMany({
      where: {
        status: 'PENDING_PAYMENT',
        expiredAt: { lte: now },
      },
      include: {
        slot: true,
        order: true,
      },
    });

    let expiredCount = 0;
    for (const b of expiredBookings) {
      await this.prisma.$transaction(async (tx) => {
        // 原子状态扭转：仅 PENDING_PAYMENT 可置为 EXPIRED，并发/重复执行安全
        const transition = await tx.booking.updateMany({
          where: { id: b.id, status: 'PENDING_PAYMENT' },
          data: { status: 'EXPIRED' },
        });
        if (transition.count === 0) return;

        // 释放场地占用（选场地流程）
        await tx.courtOccupancy.deleteMany({ where: { bookingId: b.id } });

        // 释放库存（条件递减防负数）
        if (b.slot) {
          await tx.venueSlot.updateMany({
            where: { id: b.slot.id, bookedCapacity: { gte: b.quantity } },
            data: { bookedCapacity: { decrement: b.quantity } },
          });
          // 修复时段状态（保留 CLOSED / OUT_OF_HOURS / RESERVED）
          const slot = await tx.venueSlot.findUnique({ where: { id: b.slot.id } });
          if (slot) {
            let status = slot.status;
            if (
              status !== SlotStatus.CLOSED &&
              status !== SlotStatus.OUT_OF_HOURS &&
              status !== SlotStatus.RESERVED &&
              status !== SlotStatus.ADMIN_ONLY
            ) {
              status = slot.bookedCapacity >= slot.totalCapacity ? SlotStatus.FULL : SlotStatus.AVAILABLE;
            }
            if (status !== slot.status) {
              await tx.venueSlot.update({ where: { id: slot.id }, data: { status } });
            }
          }
        }

        if (b.order) {
          await tx.order.updateMany({
            where: { id: b.order.id, orderStatus: 'PENDING_PAYMENT' },
            data: { orderStatus: 'EXPIRED' },
          });
        }
      });
      expiredCount++;
    }

    if (expiredCount > 0) {
      this.logger.log(`Expired ${expiredCount} pending bookings`);
    }
    return { expiredCount, message: `已成功处理 ${expiredCount} 笔超时待支付订单并释放对应库存` };
  }

  /**
   * 一键生成今日晚高峰火爆客流（仅允许非生产环境，防止污染真实运营数据）
   */
  async generatePeakTraffic() {
    if (process.env.NODE_ENV === 'production') {
      throw new BusinessException('演示数据注入功能仅允许在非生产环境使用', BusinessErrorCode.FORBIDDEN);
    }
    const today = dayjs().format('YYYY-MM-DD');
    const peakSlots = await this.prisma.venueSlot.findMany({
      where: {
        date: today,
        startTime: { in: ['18:00', '19:00', '20:00'] },
      },
    });

    for (const s of peakSlots) {
      await this.prisma.venueSlot.update({
        where: { id: s.id },
        data: {
          bookedCapacity: s.totalCapacity,
          status: 'FULL',
        },
      });
    }

    return {
      affectedSlots: peakSlots.length,
      message: `今日晚高峰 18:00-21:00 所有场馆时段已成功设为【爆满】热度状态！`,
    };
  }
}
