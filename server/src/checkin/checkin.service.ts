import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { BusinessException, BusinessErrorCode } from '../common/exceptions/business.exception';
import { BookingStatus, OrderStatus } from '../common/enums';
import * as dayjs from 'dayjs';

/**
 * ============================================================================
 * 扫码核销业务服务 (CheckinService)
 * ----------------------------------------------------------------------------
 * 核心设计亮点：
 * 1. 扫码核销二维码预检：
 *    兼容标准核销码 (SV...)、预约单号 (BK...) 以及 JSON 报文格式二维码，
 *    在管理员确认前提取预约人、场馆、时段与金额供现场核对。
 * 2. 严格的防重复核销拦截 (Idempotent & Anti-Replay)：
 *    若预约处于 CHECKED_IN 或 COMPLETED 状态，直接抛出业务异常，并动态指出
 *    “已于何时由哪位管理员完成核销”，杜绝二人持同一截图重复入场漏洞。
 * 3. 审计留痕与入场通知：
 *    核销成功自动创建 CheckinRecord、OperationLog 审计流水并向用户下发入场通知。
 * ============================================================================
 */
@Injectable()
export class CheckinService {
  private readonly logger = new Logger(CheckinService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 解析并预检二维码/核销码信息（管理员扫码第一步）
   *
   * @param codeStr 扫描得到的字符串或手动输入的核销码
   * @returns 预约人姓名、联系方式、预约时段、场馆与应收/实收详情
   */
  async verifyCode(codeStr: string) {
    let cleanCode = codeStr.trim();
    
    // 兼容 JSON 格式动态二维码：{"type": "BOOKING_CHECKIN", "bookingNo": "...", "bookingCode": "..."}
    if (cleanCode.startsWith('{') && cleanCode.endsWith('}')) {
      try {
        const parsed = JSON.parse(cleanCode);
        cleanCode = parsed.bookingCode || parsed.bookingNo || cleanCode;
      } catch (e) {
        // 保持原样继续比对
      }
    } else if (cleanCode.startsWith('smartvenue://booking/')) {
      cleanCode = cleanCode.replace('smartvenue://booking/', '');
    }

    // 根据核销码或预约号查询
    const booking = await this.prisma.booking.findFirst({
      where: {
        OR: [
          { bookingCode: cleanCode },
          { bookingNo: cleanCode },
        ],
      },
      include: {
        user: true,
        venue: true,
        slot: true,
        order: true,
        checkinRecords: {
          include: { operator: true },
          orderBy: { checkinAt: 'desc' },
        },
      },
    });

    if (!booking) {
      throw new BusinessException('无效的核销码或预约不存在', BusinessErrorCode.QRCODE_INVALID);
    }

    // 防重复核销安全拦截提示：明确输出上次核销人与精确时间
    if (booking.status === BookingStatus.CHECKED_IN || booking.status === BookingStatus.COMPLETED) {
      const lastCheckin = booking.checkinRecords[0];
      const checkinTimeStr = lastCheckin ? dayjs(lastCheckin.checkinAt).format('YYYY-MM-DD HH:mm:ss') : '此前';
      const operatorName = lastCheckin?.operator?.nickname || '工作人员';
      throw new BusinessException(
        `该预约已于 ${checkinTimeStr} 由 [${operatorName}] 完成核销，请勿重复核销！`,
        BusinessErrorCode.CHECKIN_ALREADY_DONE,
      );
    }

    if (booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.REFUNDED) {
      throw new BusinessException('该预约已处于取消/已退款状态，无法核销入场', BusinessErrorCode.BOOKING_STATUS_INVALID);
    }

    if (booking.status === BookingStatus.PENDING_PAYMENT) {
      throw new BusinessException('该预约尚未完成支付，请先支付后再核销', BusinessErrorCode.BOOKING_STATUS_INVALID);
    }

    return {
      bookingId: booking.id,
      bookingNo: booking.bookingNo,
      bookingCode: booking.bookingCode,
      userName: booking.contactName || booking.user.nickname,
      userPhone: booking.contactPhone || booking.user.phone,
      venueName: booking.venue.name,
      venueAddress: booking.venue.address,
      bookingDate: booking.bookingDate,
      timeRange: `${booking.startTime}-${booking.endTime}`,
      quantity: booking.quantity,
      courtNo: booking.courtNo,
      amount: booking.totalAmount,
      status: booking.status,
      statusText: '待核销',
      canConfirm: true,
    };
  }

  /**
   * 管理员确认核销入场（管理员扫码第二步）
   *
   * @param bookingId 预约 ID
   * @param operatorId 执行核销的前台管理员 ID
   */
  async confirmCheckin(bookingId: string, operatorId: string) {
    const operator = await this.prisma.user.findUnique({
      where: { id: operatorId },
    });

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        venue: true,
        order: true,
        checkinRecords: true,
      },
    });

    if (!booking) {
      throw new BusinessException('预约记录不存在', BusinessErrorCode.BOOKING_NOT_FOUND);
    }

    if (booking.status === BookingStatus.CHECKED_IN || booking.status === BookingStatus.COMPLETED) {
      throw new BusinessException('该预约已被核销，请勿重复核销', BusinessErrorCode.CHECKIN_ALREADY_DONE);
    }

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BusinessException('仅待使用的有效预约可进行核销', BusinessErrorCode.BOOKING_STATUS_INVALID);
    }

    const now = new Date();

    return await this.prisma.$transaction(async (tx) => {
      // 0. 原子状态扭转（防并发重复核销）：
      // 仅当预约仍处于 CONFIRMED 时更新成功，两个管理员同时扫码只有一个能核销成功。
      const transition = await tx.booking.updateMany({
        where: { id: booking.id, status: BookingStatus.CONFIRMED },
        data: {
          status: BookingStatus.CHECKED_IN,
          checkedInAt: now,
        },
      });

      if (transition.count === 0) {
        throw new BusinessException('该预约刚刚已被核销，请勿重复操作', BusinessErrorCode.CHECKIN_ALREADY_DONE);
      }

      // 1. 创建核销流水记录
      const record = await tx.checkinRecord.create({
        data: {
          bookingId: booking.id,
          userId: booking.userId,
          operatorId,
          checkinCode: booking.bookingCode,
          checkinAt: now,
          status: 'SUCCESS',
        },
      });

      // 2. 更新关联订单状态为 COMPLETED
      if (booking.order) {
        await tx.order.update({
          where: { id: booking.order.id },
          data: {
            orderStatus: OrderStatus.COMPLETED,
          },
        });
      }

      // 3. 记录全局管理员操作审计日志
      await tx.operationLog.create({
        data: {
          operatorId,
          action: 'CHECKIN',
          module: 'CHECKIN',
          targetId: booking.id,
          description: `管理员 [${operator?.nickname || operatorId}] 完成核销：预约号 ${booking.bookingNo}，场馆【${booking.venue.name}】`,
        },
      });

      // 4. 向用户下发实时入场通知
      await tx.notification.create({
        data: {
          userId: booking.userId,
          title: '已完成入场核销',
          content: `您在【${booking.venue.name}】的预约已于 ${dayjs(now).format('HH:mm')} 完成核销入场，祝您运动愉快！`,
          type: 'BOOKING_SUCCESS',
        },
      });

      this.logger.log(`[核销成功] 预约号: ${booking.bookingNo}, 核销管理员: ${operator?.nickname || operatorId}`);

      return {
        checkinRecordId: record.id,
        bookingNo: booking.bookingNo,
        bookingCode: booking.bookingCode,
        venueName: booking.venue.name,
        checkinAt: now,
        operatorName: operator?.nickname || '管理员',
        message: '核销成功，已允许入场',
      };
    });
  }
}
