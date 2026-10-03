import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateBookingDto, BookingPrivilege } from './dto/create-booking.dto';
import { BusinessException, BusinessErrorCode } from '../common/exceptions/business.exception';
import { MockRefundProvider, MockSmsProvider } from '../common/providers/mock-providers';
import { BookingStatus, OrderStatus, PaymentStatus, SlotStatus, BookingSource, Role, VenueStatus } from '../common/enums';
import * as dayjs from 'dayjs';

/**
 * ============================================================================
 * 预约核心业务服务 (BookingsService)
 * ----------------------------------------------------------------------------
 * 核心设计目标：
 * 1. 事务防超卖 (Anti-Overselling)：
 *    在高并发选座场景下，基于 Prisma 交互式事务 ($transaction) 强一致性锁定目标 Slot，
 *    原子校验 (bookedCapacity + quantity <= totalCapacity) 并即时扣减库存，彻底杜绝负库存。
 * 2. 状态机严格约束：
 *    遵循 PENDING_PAYMENT -> CONFIRMED -> CHECKED_IN -> COMPLETED 标准流转。
 * 3. 自动释放库存与退款：
 *    取消预约时根据订单支付状态，已支付触发退款流水，未支付直接释放，均原子归还时段库存。
 * 4. 管理员特权预约：
 *    可预约 ADMIN_ONLY 时段；满员时段可通过 RESERVE 转为内部预留，或通过 EXPAND 扩容获得名额。
 * ============================================================================
 */
@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private prisma: PrismaService,
    private mockRefund: MockRefundProvider,
    private mockSms: MockSmsProvider,
  ) {}

  /**
   * 创建场地预约（事务防超卖核心实现）
   *
   * @param userId 预约用户 ID
   * @param dto 预约参数（slotId, quantity, contactName, contactPhone, privilege 等）
   * @param role 当前用户角色
   * @returns 包含预约 ID、核销码、关联订单与倒计时的预约结果
   */
  async create(userId: string, dto: CreateBookingDto, role: string = Role.USER) {
    // 唯一编号冲突重试（bookingNo/bookingCode 随机数极小概率撞车）
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.doCreate(userId, dto, role);
      } catch (err: any) {
        const isUniqueViolation =
          err?.code === 'P2002' || (typeof err?.message === 'string' && err.message.includes('Unique constraint'));
        if (isUniqueViolation && attempt < 2) {
          this.logger.warn(`预约编号冲突，第 ${attempt + 1} 次重试生成...`);
          continue;
        }
        throw err;
      }
    }
    throw new BusinessException('系统繁忙，请重试', BusinessErrorCode.COMMON_ERROR);
  }

  private async doCreate(userId: string, dto: CreateBookingDto, role: string = Role.USER) {
    const isAdmin = role === Role.ADMIN || role === Role.SUPER_ADMIN;

    // 1. 基础校验：校验用户真实性
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new BusinessException('用户不存在', BusinessErrorCode.NOT_FOUND);
    }

    // 2. 生成业务唯一编号
    const now = dayjs();
    const dateStr = now.format('YYYYMMDDHHmmss');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const bookingNo = `BK${dateStr}${randomSuffix}`;
    // 12位防伪核销码：前缀 SV + 年月日 + 6位高安全随机数
    const bookingCode = `SV${now.format('YYYYMMDD')}${Math.floor(100000 + Math.random() * 900000)}`;
    const orderNo = `SV${dateStr}${randomSuffix}`;

    // 3. 执行 Prisma 交互式事务
    return await this.prisma.$transaction(async (tx) => {
      // 步骤 3.1: 在事务内查询目标时段实时信息
      const slot = await tx.venueSlot.findUnique({
        where: { id: dto.slotId },
        include: { venue: true },
      });

      if (!slot) {
        throw new BusinessException('所选预约时段不存在', BusinessErrorCode.SLOT_NOT_FOUND);
      }

      // 防伪造：传入的场馆 ID 必须与时段实际归属的场馆一致
      if (dto.venueId && dto.venueId !== slot.venueId) {
        throw new BusinessException('场馆与时段不匹配，请刷新后重试', BusinessErrorCode.PARAM_INVALID);
      }

      if (slot.status === SlotStatus.CLOSED) {
        throw new BusinessException('该时段已暂停预约', BusinessErrorCode.SLOT_CLOSED);
      }

      // 场馆状态校验：已删除/下架/维护中的场馆不可预约
      if (slot.venue.status !== VenueStatus.ACTIVE) {
        throw new BusinessException('该场馆已下架或维护中，暂不可预约', BusinessErrorCode.VENUE_NOT_FOUND);
      }

      // 临时闭馆日期校验：闭馆日当天即使有可用时段也不可预约
      const closedDate = await tx.venueClosedDate.findFirst({
        where: { venueId: slot.venueId, date: slot.date },
      });
      if (closedDate) {
        throw new BusinessException(
          `该场馆 ${slot.date} 临时闭馆（${closedDate.reason}），请选择其他日期`,
          BusinessErrorCode.SLOT_CLOSED,
        );
      }

      // 校验 advanceDays 与历史时间
      this.validateBookingTime(slot, isAdmin);

      // 管理员专属/营业时间外时段校验
      if ((slot.status === SlotStatus.ADMIN_ONLY || slot.status === SlotStatus.OUT_OF_HOURS) && !isAdmin) {
        throw new BusinessException('该时段为管理员专属，普通用户不可预约', BusinessErrorCode.FORBIDDEN);
      }

      // 步骤 3.2: 余量计算与防超卖拦截
      const originalCapacity = slot.totalCapacity;
      const availableCapacity = Math.max(0, originalCapacity - slot.bookedCapacity);
      let targetCapacity = originalCapacity;

      if (availableCapacity < dto.quantity) {
        if (!isAdmin || !dto.privilege || dto.privilege === BookingPrivilege.NONE) {
          this.logger.warn(`防超卖拦截触发: slotId=${slot.id}, 余量=${availableCapacity}, 尝试购买=${dto.quantity}`);
          throw new BusinessException(
            `该时段余量不足（当前仅剩 ${availableCapacity} 个名额），请重新选择时段`,
            BusinessErrorCode.SLOT_CAPACITY_NOT_ENOUGH,
          );
        }

        if (dto.privilege === BookingPrivilege.EXPAND) {
          // 调大容量（管理员优先权），但设置绝对上限：原容量的 120%，
          // 防止管理员无限扩容破坏真实场地容量约束。
          const expandCap = Math.max(originalCapacity, Math.ceil(originalCapacity * 1.2));
          if (slot.bookedCapacity + dto.quantity > expandCap) {
            throw new BusinessException(
              `扩容已达上限（该时段最多 ${expandCap} 个名额）`,
              BusinessErrorCode.SLOT_CAPACITY_NOT_ENOUGH,
            );
          }
          targetCapacity = slot.bookedCapacity + dto.quantity;
        } else if (dto.privilege === BookingPrivilege.RESERVE) {
          // 转为内部预留：标记为 RESERVED，并锁定名额
          targetCapacity = slot.bookedCapacity + dto.quantity;
        }
      }

      // 步骤 3.3: 原子扣减库存（条件更新防并发超卖）
      // bookedCapacity <= targetCapacity - quantity 不满足时更新 0 行直接拒绝，
      // 两个并发请求最多一个扣减成功，杜绝 bookedCapacity > totalCapacity。
      const deduct = await tx.venueSlot.updateMany({
        where: {
          id: slot.id,
          bookedCapacity: { lte: targetCapacity - dto.quantity },
        },
        data: {
          bookedCapacity: { increment: dto.quantity },
          totalCapacity: targetCapacity,
        },
      });

      if (deduct.count === 0) {
        this.logger.warn(`并发超卖拦截: slotId=${slot.id}, 尝试购买=${dto.quantity}`);
        throw new BusinessException(
          '该时段余量不足（可能已被他人同时预约），请刷新后重新选择',
          BusinessErrorCode.SLOT_CAPACITY_NOT_ENOUGH,
        );
      }

      // 场地编号预校验（真正占用写入在 booking 创建之后，同一事务内完成）
      // 上限用 targetCapacity：管理员 EXPAND 扩容后允许选择新增场地编号
      if (dto.courtNo !== undefined && dto.courtNo !== null) {
        if (dto.courtNo < 1 || dto.courtNo > targetCapacity) {
          throw new BusinessException(
            `场地编号须在 1 ~ ${targetCapacity} 之间`,
            BusinessErrorCode.PARAM_INVALID,
          );
        }
        if (dto.quantity !== 1) {
          throw new BusinessException('选择具体场地时预约数量只能为 1', BusinessErrorCode.PARAM_INVALID);
        }
      }

      // 重读扣减后的最新库存，计算并同步时段状态
      const freshSlot = await tx.venueSlot.findUnique({ where: { id: slot.id } });
      const newBookedCapacity = freshSlot!.bookedCapacity;
      let newStatus: SlotStatus = newBookedCapacity >= targetCapacity ? SlotStatus.FULL : SlotStatus.AVAILABLE;

      if (dto.privilege === BookingPrivilege.RESERVE) {
        newStatus = SlotStatus.RESERVED;
      } else if (slot.status === SlotStatus.ADMIN_ONLY || slot.status === SlotStatus.OUT_OF_HOURS) {
        // 营业时间外时段被管理员预约后仍保持原状态，避免向普通用户开放
        newStatus = newBookedCapacity >= targetCapacity ? SlotStatus.FULL : slot.status;
      }

      await tx.venueSlot.update({
        where: { id: slot.id },
        data: { status: newStatus },
      });

      const totalAmount = slot.price * dto.quantity;
      // 默认 15 分钟待支付锁定期
      const expiredAt = now.add(15, 'minute').toDate();

      // 步骤 3.4: 写入预约主表 (Booking)
      const booking = await tx.booking.create({
        data: {
          bookingNo,
          userId,
          venueId: slot.venueId,
          slotId: slot.id,
          bookingDate: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          quantity: dto.quantity,
          unitPrice: slot.price,
          totalAmount,
          status: BookingStatus.PENDING_PAYMENT,
          source: isAdmin ? BookingSource.ADMIN : BookingSource.USER,
          bookingCode,
          contactName: dto.contactName,
          contactPhone: dto.contactPhone,
          studentNo: dto.studentNo,
          courtNo: dto.courtNo ?? null,
          expiredAt,
        },
      });

      // 步骤 3.4b: 写入场地占用（CourtOccupancy 唯一约束保证同时段同场地互斥）。
      // 若并发下撞唯一约束，抛错使整个事务回滚（库存/预约一并撤销）。
      if (dto.courtNo !== undefined && dto.courtNo !== null) {
        try {
          await tx.courtOccupancy.create({
            data: { slotId: slot.id, courtNo: dto.courtNo, bookingId: booking.id },
          });
        } catch (err: any) {
          if (err?.code === 'P2002') {
            throw new BusinessException(
              `该场地的 ${slot.date} ${slot.startTime}-${slot.endTime} 时段刚被他人预约，请换一块场地`,
              BusinessErrorCode.SLOT_ALREADY_FULL,
            );
          }
          throw err;
        }
      }

      // 步骤 3.5: 写入订单表 (Order)
      const order = await tx.order.create({
        data: {
          orderNo,
          userId,
          bookingId: booking.id,
          amount: totalAmount,
          paidAmount: 0,
          refundAmount: 0,
          paymentStatus: PaymentStatus.UNPAID,
          orderStatus: OrderStatus.PENDING_PAYMENT,
        },
      });

      // 步骤 3.6: 写入站内待支付提醒通知
      await tx.notification.create({
        data: {
          userId,
          title: '待支付订单提醒',
          content: `您已成功锁定【${slot.venue.name}】${slot.date} ${slot.startTime}-${slot.endTime} 场地，请在15分钟内完成支付。`,
          type: 'REMINDER',
        },
      });

      this.logger.log(`[预约成功] 预约号: ${bookingNo}, 订单号: ${orderNo}, 金额: ¥${totalAmount / 100}`);

      return {
        bookingId: booking.id,
        bookingNo: booking.bookingNo,
        bookingCode: booking.bookingCode,
        orderId: order.id,
        orderNo: order.orderNo,
        amount: totalAmount,
        expiredAt,
        venueName: slot.venue.name,
        date: slot.date,
        timeRange: `${slot.startTime}-${slot.endTime}`,
        quantity: dto.quantity,
        source: booking.source,
      };
    });
  }

  /**
   * 获取预约详情（包含场馆、时段、支付流水与核销记录关联）
   *
   * @param id 预约 ID
   * @param userId 操作用户 ID（用于越权数据校验）
   */
  async findOne(id: string, userId?: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        venue: true,
        slot: true,
        order: {
          include: {
            payments: true,
            refunds: true,
          },
        },
        checkinRecords: true,
      },
    });

    if (!booking) {
      throw new BusinessException('预约记录不存在', BusinessErrorCode.BOOKING_NOT_FOUND);
    }

    // 垂直越权防护：非该用户无法查看他人预约
    if (userId && booking.userId !== userId) {
      throw new BusinessException('无权查看该预约', BusinessErrorCode.FORBIDDEN);
    }

    return booking;
  }

  /**
   * 取消预约（释放库存并触发模拟原路退款）
   *
   * @param id 预约 ID
   * @param userId 操作人 ID
   * @param operatorRole 操作人角色（USER 或 ADMIN）
   */
  async cancel(id: string, userId: string, operatorRole: string = 'USER') {
    // 事务外粗检：存在性与越权（用于友好报错）
    const preCheck = await this.prisma.booking.findUnique({
      where: { id },
    });

    if (!preCheck) {
      throw new BusinessException('预约记录不存在', BusinessErrorCode.BOOKING_NOT_FOUND);
    }

    if (operatorRole === 'USER' && preCheck.userId !== userId) {
      throw new BusinessException('无权操作该预约', BusinessErrorCode.FORBIDDEN);
    }

    return await this.prisma.$transaction(async (tx) => {
      // 0. 事务内重读最新状态（防并发重复取消/退款）
      const booking = await tx.booking.findUnique({
        where: { id },
        include: {
          order: true,
          slot: true,
          venue: true,
        },
      });

      if (!booking) {
        throw new BusinessException('预约记录不存在', BusinessErrorCode.BOOKING_NOT_FOUND);
      }

      // 状态机拦截：已核销或已完成的预约禁止取消
      if (booking.status === BookingStatus.CHECKED_IN || booking.status === BookingStatus.COMPLETED) {
        throw new BusinessException('已核销或已完成的预约无法取消', BusinessErrorCode.BOOKING_CANNOT_CANCEL);
      }

      if (booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.REFUNDED) {
        throw new BusinessException('该预约已处于取消/已退款状态，请勿重复操作', BusinessErrorCode.BOOKING_STATUS_INVALID);
      }

      // 已过期订单：库存已由过期任务释放，禁止再次取消（否则重复释放库存）
      if (booking.status === BookingStatus.EXPIRED) {
        throw new BusinessException('该订单已超时关闭，库存已自动释放，无需取消', BusinessErrorCode.BOOKING_STATUS_INVALID);
      }

      // 1. 原子状态扭转：仅 PENDING_PAYMENT / CONFIRMED 允许取消，
      // 并发下只有一个请求能扭转成功，杜绝重复退款。
      const isPaid = booking.order && booking.order.paymentStatus === PaymentStatus.PAID;
      const targetStatus = isPaid ? BookingStatus.REFUNDED : BookingStatus.CANCELLED;

      const transition = await tx.booking.updateMany({
        where: {
          id: booking.id,
          status: { in: [BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED] },
        },
        data: {
          status: targetStatus,
          cancelledAt: new Date(),
        },
      });

      if (transition.count === 0) {
        throw new BusinessException('该预约状态已变更，请勿重复操作', BusinessErrorCode.BOOKING_STATUS_INVALID);
      }

      // 2. 恢复 Slot 实时库存容量（条件递减防负数，保留 CLOSED / OUT_OF_HOURS / RESERVED 状态）
      if (booking.slot) {
        await tx.venueSlot.updateMany({
          where: {
            id: booking.slot.id,
            bookedCapacity: { gte: booking.quantity },
          },
          data: { bookedCapacity: { decrement: booking.quantity } },
        });

        // 重读最新库存并修复状态
        const slot = await tx.venueSlot.findUnique({ where: { id: booking.slot.id } });
        if (slot) {
          const newBooked = slot.bookedCapacity;
          let status = slot.status;
          // 闭馆、超营业保留、内部预留、管理员专属状态不自动恢复为 AVAILABLE
          if (status !== SlotStatus.CLOSED && status !== SlotStatus.OUT_OF_HOURS && status !== SlotStatus.RESERVED && status !== SlotStatus.ADMIN_ONLY) {
            status = newBooked >= slot.totalCapacity ? SlotStatus.FULL : SlotStatus.AVAILABLE;
          }
          // 如果 RESERVED 状态下释放后无人占用，恢复为 AVAILABLE
          if (status === SlotStatus.RESERVED && newBooked === 0) {
            status = SlotStatus.AVAILABLE;
          }
          if (status !== slot.status) {
            await tx.venueSlot.update({
              where: { id: slot.id },
              data: { status },
            });
          }
        }
      }

      // 2b. 释放场地占用（选场地流程产生的 CourtOccupancy）
      await tx.courtOccupancy.deleteMany({ where: { bookingId: booking.id } });

      // 3. 根据订单支付状态决定退款还是直接关闭订单
      let refundRecord = null;

      if (isPaid && booking.order) {
        // 调用微信模拟退款 Provider 生成退款流水
        const refundResult = await this.mockRefund.processRefund(
          booking.order.orderNo,
          booking.order.paidAmount,
          '用户主动取消预约退款',
        );

        // 写入退款明细表
        refundRecord = await tx.refund.create({
          data: {
            refundNo: refundResult.refundNo,
            orderId: booking.order.id,
            amount: booking.order.paidAmount,
            reason: '用户主动取消',
            status: 'SUCCESS',
            completedAt: new Date(),
          },
        });

        // 扭转 Order 状态为 REFUNDED
        await tx.order.update({
          where: { id: booking.order.id },
          data: {
            refundAmount: booking.order.paidAmount,
            paymentStatus: PaymentStatus.REFUNDED,
            orderStatus: OrderStatus.REFUNDED,
            cancelledAt: new Date(),
          },
        });
      } else if (booking.order) {
        // 未支付订单直接置为 CANCELLED
        await tx.order.update({
          where: { id: booking.order.id },
          data: {
            orderStatus: OrderStatus.CANCELLED,
            cancelledAt: new Date(),
          },
        });
      }

      // 3. 发送业务通知与记录管理员操作审计日志
      await tx.notification.create({
        data: {
          userId: booking.userId,
          title: isPaid ? '退款成功通知' : '预约取消通知',
          content: isPaid
            ? `您取消的【${booking.venue.name}】预约已全额退款 ¥${booking.totalAmount / 100}，款项将原路退回。`
            : `您已成功取消【${booking.venue.name}】的预约。`,
          type: isPaid ? 'REFUND' : 'CANCELLED',
        },
      });

      await tx.operationLog.create({
        data: {
          operatorId: userId,
          action: 'CANCEL_BOOKING',
          module: 'BOOKING',
          targetId: booking.id,
          description: `取消预约 ${booking.bookingNo}，释放容量 ${booking.quantity}${isPaid ? '，执行退款 ¥' + booking.totalAmount / 100 : ''}`,
        },
      });

      return {
        bookingId: booking.id,
        bookingNo: booking.bookingNo,
        status: isPaid ? 'REFUNDED' : 'CANCELLED',
        refundAmount: isPaid ? booking.totalAmount : 0,
        refundNo: refundRecord?.refundNo || null,
        message: isPaid ? '预约已取消并已完成全额退款' : '预约已成功取消',
      };
    });
  }

  /**
   * 校验预约时间合法性
   */
  private validateBookingTime(slot: any, isAdmin: boolean) {
    const venue = slot.venue;
    const today = dayjs().format('YYYY-MM-DD');

    if (slot.date < today) {
      throw new BusinessException('不能预约历史日期', BusinessErrorCode.BOOKING_TIME_INVALID);
    }

    const maxBookDate = dayjs().add(venue.advanceDays || 7, 'day').format('YYYY-MM-DD');
    if (slot.date > maxBookDate) {
      throw new BusinessException(`最多可提前 ${venue.advanceDays || 7} 天预约`, BusinessErrorCode.BOOKING_TIME_INVALID);
    }

    if (slot.date === today) {
      const nowStr = dayjs().format('HH:mm');
      // 普通用户只能约未开始的时段；管理员可约当前进行中且未结束的时段（代预约/优先权）
      const timeLimit = isAdmin ? slot.endTime : slot.startTime;
      if (timeLimit <= nowStr) {
        throw new BusinessException(
          isAdmin ? '该时段已结束，无法预约' : '该时段已开始或已结束，无法预约',
          BusinessErrorCode.BOOKING_TIME_INVALID,
        );
      }
    }
  }
}
