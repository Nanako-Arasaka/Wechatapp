import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { BusinessException, BusinessErrorCode } from '../common/exceptions/business.exception';
import { MockWechatPayProvider } from '../common/providers/mock-providers';
import { BookingStatus, OrderStatus, PaymentStatus } from '../common/enums';
import * as dayjs from 'dayjs';

/**
 * ============================================================================
 * 订单与支付业务服务 (OrdersService)
 * ----------------------------------------------------------------------------
 * 核心职责：
 * 1. 订单列表聚合与多维状态筛选（待支付、待使用、已完成、已退款）
 * 2. 模拟微信支付收银台流转：
 *    调用 MockWechatPayProvider 生成真实规范的支付交易流水号 (Payment 记录)，
 *    并在单个事务内将订单状态扭转为 PAID，预约状态扭转为 CONFIRMED，触发微信入场凭证。
 * 3. 订单支付防重与超时防护。
 * ============================================================================
 */
@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private prisma: PrismaService,
    private mockWechatPay: MockWechatPayProvider,
  ) {}

  /**
   * 查询当前用户的订单列表（支持按业务 Tab 状态筛选）
   *
   * @param userId 用户 ID
   * @param status 业务筛选状态 (ALL, PENDING_PAYMENT, CONFIRMED, COMPLETED, REFUNDED)
   */
  async findAll(userId: string, status?: string) {
    const where: any = { userId };

    if (status && status !== 'ALL') {
      if (status === 'PENDING_PAYMENT') {
        where.orderStatus = OrderStatus.PENDING_PAYMENT;
      } else if (status === 'PAID' || status === 'CONFIRMED') {
        where.orderStatus = OrderStatus.PAID;
        where.booking = { status: BookingStatus.CONFIRMED };
      } else if (status === 'CHECKED_IN' || status === 'COMPLETED') {
        where.booking = { status: { in: [BookingStatus.CHECKED_IN, BookingStatus.COMPLETED] } };
      } else if (status === 'CANCELLED') {
        where.orderStatus = OrderStatus.CANCELLED;
      } else if (status === 'REFUNDED') {
        where.orderStatus = OrderStatus.REFUNDED;
      }
    }

    const orders = await this.prisma.order.findMany({
      where,
      include: {
        booking: {
          include: {
            venue: true,
            slot: true,
          },
        },
        payments: true,
        refunds: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // 扁平化映射为前端易于消费的数据结构
    return orders.map((order) => {
      const b = order.booking;
      return {
        id: order.id,
        orderNo: order.orderNo,
        bookingId: b.id,
        bookingNo: b.bookingNo,
        bookingCode: b.bookingCode,
        venueId: b.venue.id,
        venueName: b.venue.name,
        venueImage: b.venue.coverImage,
        venueAddress: b.venue.address,
        bookingDate: b.bookingDate,
        startTime: b.startTime,
        endTime: b.endTime,
        timeRange: `${b.startTime}-${b.endTime}`,
        quantity: b.quantity,
        amount: order.amount,
        paidAmount: order.paidAmount,
        refundAmount: order.refundAmount,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        bookingStatus: b.status,
        createdAt: order.createdAt,
        paidAt: order.paidAt,
        expiredAt: b.expiredAt,
      };
    });
  }

  /**
   * 查询单个订单详情（包含支付流水、退款记录与前台核销人信息）
   *
   * @param id 订单 ID
   * @param userId 当前用户 ID (越权校验)
   */
  async findOne(id: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        booking: {
          include: {
            venue: true,
            slot: true,
            checkinRecords: {
              include: { operator: true },
            },
          },
        },
        payments: true,
        refunds: true,
      },
    });

    if (!order) {
      throw new BusinessException('订单不存在', BusinessErrorCode.ORDER_NOT_FOUND);
    }

    if (order.userId !== userId) {
      throw new BusinessException('无权查看该订单', BusinessErrorCode.FORBIDDEN);
    }

    return order;
  }

  /**
   * 模拟微信支付（核心状态机推进）
   *
   * @param id 订单 ID
   * @param userId 支付用户 ID
   */
  async pay(id: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        booking: {
          include: { venue: true, slot: true },
        },
      },
    });

    if (!order) {
      throw new BusinessException('订单不存在', BusinessErrorCode.ORDER_NOT_FOUND);
    }

    if (order.userId !== userId) {
      throw new BusinessException('无权支付该订单', BusinessErrorCode.FORBIDDEN);
    }

    if (order.paymentStatus === PaymentStatus.PAID) {
      throw new BusinessException('订单已支付，请勿重复操作', BusinessErrorCode.ORDER_ALREADY_PAID);
    }

    if (order.orderStatus === OrderStatus.CANCELLED || order.orderStatus === OrderStatus.EXPIRED) {
      throw new BusinessException('订单已关闭或超时过期', BusinessErrorCode.ORDER_PAY_FAILED);
    }

    // 已过支付截止时间的订单不允许再支付：先就地过期并释放库存
    if (order.booking.expiredAt && new Date(order.booking.expiredAt).getTime() <= Date.now()) {
      await this.expireOrderInline(order);
      throw new BusinessException('订单已超时关闭，请重新预约', BusinessErrorCode.ORDER_PAY_FAILED);
    }

    // 1. 调用企业级 Mock 微信支付 Provider，生成微信商户号支付流水
    const payResult = await this.mockWechatPay.createPayment(order.orderNo, order.amount);

    // 2. 事务内执行入账与状态扭转
    return await this.prisma.$transaction(async (tx) => {
      // 步骤 2.1: 原子状态扭转（防并发重复支付）
      // 仅当订单仍处于「待支付且未付款」时更新成功；两个并发 pay 请求只有一个能扭转状态。
      const transition = await tx.order.updateMany({
        where: {
          id: order.id,
          orderStatus: OrderStatus.PENDING_PAYMENT,
          paymentStatus: PaymentStatus.UNPAID,
        },
        data: {
          paidAmount: order.amount,
          paymentStatus: PaymentStatus.PAID,
          orderStatus: OrderStatus.PAID,
          paidAt: payResult.paidAt,
        },
      });

      if (transition.count === 0) {
        throw new BusinessException('订单状态已变更（可能已支付或已关闭），请勿重复支付', BusinessErrorCode.ORDER_ALREADY_PAID);
      }

      // 步骤 2.2: 插入支付记录 (Payment)
      const payment = await tx.payment.create({
        data: {
          paymentNo: payResult.paymentNo,
          orderId: order.id,
          paymentMethod: 'WECHAT_PAY',
          transactionNo: payResult.transactionNo,
          amount: order.amount,
          status: 'SUCCESS',
          paidAt: payResult.paidAt,
        },
      });

      // 步骤 2.3: 更新关联 Booking 为 CONFIRMED (待核销使用)
      await tx.booking.updateMany({
        where: { id: order.booking.id, status: BookingStatus.PENDING_PAYMENT },
        data: {
          status: BookingStatus.CONFIRMED,
        },
      });

      // 步骤 2.4: 发送支付成功与核销凭证推送
      await tx.notification.create({
        data: {
          userId,
          title: '支付成功通知',
          content: `您预约的【${order.booking.venue.name}】已支付成功，核销码：${order.booking.bookingCode}，欢迎入场体验！`,
          type: 'PAYMENT_SUCCESS',
        },
      });

      this.logger.log(`[支付成功] 订单: ${order.orderNo}, 支付流水: ${payment.paymentNo}, 金额: ¥${order.amount / 100}`);

      return {
        orderId: order.id,
        orderNo: order.orderNo,
        bookingNo: order.booking.bookingNo,
        bookingCode: order.booking.bookingCode,
        paymentNo: payment.paymentNo,
        transactionNo: payment.transactionNo,
        amount: order.amount,
        paidAt: payment.paidAt,
        venueName: order.booking.venue.name,
        date: order.booking.bookingDate,
        timeRange: `${order.booking.startTime}-${order.booking.endTime}`,
      };
    });
  }

  /**
   * 将已过支付截止时间的待支付订单就地过期，并原子释放锁定的时段库存
   */
  private async expireOrderInline(order: any) {
    await this.prisma.$transaction(async (tx) => {
      // 仅扭转仍处于待支付状态的预约，幂等防重
      const transition = await tx.booking.updateMany({
        where: { id: order.booking.id, status: BookingStatus.PENDING_PAYMENT },
        data: { status: BookingStatus.EXPIRED },
      });
      if (transition.count === 0) return;

      await tx.order.updateMany({
        where: { id: order.id, orderStatus: OrderStatus.PENDING_PAYMENT },
        data: { orderStatus: OrderStatus.EXPIRED },
      });

      if (order.booking.slotId) {
        await tx.venueSlot.updateMany({
          where: { id: order.booking.slotId, bookedCapacity: { gte: order.booking.quantity } },
          data: { bookedCapacity: { decrement: order.booking.quantity } },
        });
        // 修复时段状态
        const slot = await tx.venueSlot.findUnique({ where: { id: order.booking.slotId } });
        if (slot && slot.status === 'FULL' && slot.bookedCapacity < slot.totalCapacity) {
          await tx.venueSlot.update({ where: { id: slot.id }, data: { status: 'AVAILABLE' } });
        }
      }
    });
    this.logger.log(`[订单过期] 订单 ${order.orderNo} 支付时已超截止时间，已就地过期并释放库存`);
  }
}
