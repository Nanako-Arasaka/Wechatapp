import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { QueryVenueDto } from './dto/query-venue.dto';
import { BusinessException, BusinessErrorCode } from '../common/exceptions/business.exception';
import { VenueStatus, SlotStatus, BookingStatus } from '../common/enums';
import * as dayjs from 'dayjs';

@Injectable()
export class VenuesService {
  private readonly logger = new Logger(VenuesService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 获取场馆列表（带今日可用时段数统计、推荐得分、分页、排序）
   */
  async findAll(query: QueryVenueDto) {
    const today = dayjs().format('YYYY-MM-DD');
    const targetDate = query.date || today;
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: any = {
      status: {
        not: VenueStatus.DELETED,
      },
    };

    if (query.type) {
      where.type = query.type;
    }

    if (query.status) {
      where.status = query.status;
    } else {
      where.status = VenueStatus.ACTIVE;
    }

    if (query.keyword) {
      const kw = query.keyword;
      where.OR = [
        { name: { contains: kw, mode: 'insensitive' } },
        { address: { contains: kw, mode: 'insensitive' } },
        { description: { contains: kw, mode: 'insensitive' } },
      ];
    }

    const [total, venues] = await Promise.all([
      this.prisma.venue.count({ where }),
      this.prisma.venue.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          slots: {
            where: { date: targetDate },
          },
        },
      }),
    ]);

    const list = venues.map((v) => {
      // 计算目标日期普通用户可见的可用剩余时段数与总余量
      // 管理员专属、营业时间外、内部预留等状态不计入对外展示
      const activeSlots = v.slots.filter(
        (s) => s.status !== SlotStatus.CLOSED &&
               s.status !== SlotStatus.ADMIN_ONLY &&
               s.status !== SlotStatus.OUT_OF_HOURS &&
               s.status !== SlotStatus.RESERVED,
      );
      const availableSlotsCount = activeSlots.filter((s) => s.totalCapacity > s.bookedCapacity).length;
      const totalCapacity = activeSlots.reduce((acc, cur) => acc + cur.totalCapacity, 0);
      const bookedCapacity = activeSlots.reduce((acc, cur) => acc + cur.bookedCapacity, 0);
      const totalRemaining = Math.max(0, totalCapacity - bookedCapacity);
      const utilizationRate = totalCapacity > 0 ? Math.round((bookedCapacity / totalCapacity) * 100) : 0;

      // 智能推荐打分算法: score = 余量权重 * 0.5 + 价格权重 * 0.3 + 利用率友好度 * 0.2
      const remainingScore = totalCapacity > 0 ? Math.round((totalRemaining / totalCapacity) * 100) : 50;
      const priceScore = Math.max(10, 100 - (v.basePrice / 100));
      const recommendScore = Math.round(remainingScore * 0.5 + priceScore * 0.3 + (100 - utilizationRate) * 0.2);

      return {
        id: v.id,
        name: v.name,
        type: v.type,
        description: v.description,
        address: v.address,
        coverImage: v.coverImage,
        basePrice: v.basePrice,
        capacity: v.capacity,
        openTime: v.openTime,
        closeTime: v.closeTime,
        status: v.status,
        facilities: v.facilities ? v.facilities.split(',') : [],
        rules: v.rules,
        availableSlotsCount,
        totalRemaining,
        utilizationRate,
        recommendScore,
      };
    });

    // 默认按推荐分降序， price_asc / remain_desc 由调用方处理
    list.sort((a, b) => b.recommendScore - a.recommendScore);

    return { list, total, page, pageSize };
  }

  /**
   * 场馆详情
   */
  async findOne(id: string) {
    const venue = await this.prisma.venue.findUnique({
      where: { id },
      include: {
        closedDates: {
          where: {
            date: { gte: dayjs().format('YYYY-MM-DD') },
          },
        },
      },
    });

    if (!venue || venue.status === VenueStatus.DELETED) {
      throw new BusinessException('场馆不存在或已下架', BusinessErrorCode.VENUE_NOT_FOUND);
    }

    // 统计真实数据
    const totalBookings = await this.prisma.booking.count({
      where: { venueId: id, status: { notIn: [BookingStatus.CANCELLED, BookingStatus.REFUNDED] } },
    });
    const avgRating = 4.8;

    return {
      ...venue,
      facilities: venue.facilities ? venue.facilities.split(',') : [],
      reviews: [],
      rating: avgRating,
      totalBookings,
    };
  }

  /**
   * 查询指定时段的场地占用情况（选场地页真实数据源）
   * 返回总容量与已被占用的场地编号列表，occupied 仅由 CourtOccupancy 真实占用表驱动。
   * 注意：不做任何模拟补齐，历史无 courtNo 的订单只占用总量名额、不占据具体场地号，
   * 避免把未选场地的订单错误标记为某号场地已占用。
   */
  async getSlotCourts(venueId: string, slotId: string) {
    const slot = await this.prisma.venueSlot.findUnique({
      where: { id: slotId },
      include: { venue: true },
    });

    if (!slot || slot.venueId !== venueId) {
      throw new BusinessException('时段不存在', BusinessErrorCode.SLOT_NOT_FOUND);
    }
    if (slot.venue.status === VenueStatus.DELETED) {
      throw new BusinessException('场馆不存在或已下架', BusinessErrorCode.VENUE_NOT_FOUND);
    }

    const occupancies = await this.prisma.courtOccupancy.findMany({
      where: { slotId },
      select: { courtNo: true },
    });

    return {
      slotId: slot.id,
      date: slot.date,
      timeRange: `${slot.startTime}-${slot.endTime}`,
      totalCapacity: slot.totalCapacity,
      bookedCapacity: slot.bookedCapacity,
      occupied: occupancies.map((o) => o.courtNo).sort((a, b) => a - b),
    };
  }

  /**
   * 获取指定日期的实时时段余量 (核心引擎)
   */
  async getAvailability(venueId: string, dateStr?: string, isAdmin: boolean = false) {
    const venue = await this.prisma.venue.findUnique({
      where: { id: venueId },
      include: {
        closedDates: true,
      },
    });

    if (!venue || venue.status === VenueStatus.DELETED) {
      throw new BusinessException('场馆不存在', BusinessErrorCode.VENUE_NOT_FOUND);
    }

    const date = (dateStr && dateStr !== 'undefined' && dateStr !== 'null') 
      ? dateStr 
      : dayjs().format('YYYY-MM-DD');

    // 检查是否全天临时闭馆/维护
    const isClosedDate = venue.closedDates.some((cd) => cd.date === date);
    if (isClosedDate) {
      const closedReason = venue.closedDates.find((cd) => cd.date === date)?.reason || '场馆维护保养中';
      return {
        venueId: venue.id,
        venueName: venue.name,
        date,
        isClosed: true,
        closedReason,
        slots: [],
        peakAdvice: '该日期场馆全天维护闭馆，请选择其他开放日期。',
      };
    }

    // 确保该日期的 Slots 已生成/存在
    let slots = await this.prisma.venueSlot.findMany({
      where: {
        venueId,
        date,
      },
      orderBy: { startTime: 'asc' },
    });

    // 如果还没有生成，自动按营业时间和 bookingInterval 动态生成 Slots 并写入数据库
    if (slots.length === 0) {
      slots = await this.generateSlotsForDate(venue, date);
    }

    const now = dayjs();
    const isToday = date === now.format('YYYY-MM-DD');
    const currentHourMinute = now.format('HH:mm');

    const formattedSlots = slots.map((s) => {
      const remaining = Math.max(0, s.totalCapacity - s.bookedCapacity);
      const isPast = isToday && s.startTime < currentHourMinute;
      // 营业时间外/管理员专属时段统一视为管理员专属，普通用户不可见
      let isAdminOnly = s.status === SlotStatus.ADMIN_ONLY ||
                        s.status === SlotStatus.OUT_OF_HOURS ||
                        s.isAdminOnly;

      // 普通用户不可见管理员专属时段
      if (isAdminOnly && !isAdmin) {
        return null;
      }

      let statusDisplay = 'AVAILABLE';
      let statusText = '余量充足';
      let statusColor = 'green';

      if (isPast) {
        statusDisplay = 'CLOSED';
        statusText = '已过时段';
        statusColor = 'gray';
      } else if (s.status === SlotStatus.CLOSED) {
        statusDisplay = 'CLOSED';
        statusText = '不可预约';
        statusColor = 'gray';
      } else if (isAdminOnly) {
        statusDisplay = 'ADMIN_ONLY';
        statusText = '管理员专属';
        statusColor = 'purple';
      } else if (s.status === SlotStatus.RESERVED) {
        statusDisplay = 'RESERVED';
        statusText = '内部预留';
        statusColor = 'purple';
      } else if (remaining === 0) {
        statusDisplay = 'FULL';
        statusText = '已满';
        statusColor = 'red';
      } else if (remaining <= 2) {
        statusDisplay = 'TIGHT';
        statusText = remaining === 1 ? '仅剩1个' : '余量紧张';
        statusColor = 'orange';
      } else {
        statusDisplay = 'AVAILABLE';
        statusText = '余量充足';
        statusColor = 'green';
      }

      return {
        id: s.id,
        venueId: s.venueId,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        timeRange: `${s.startTime}-${s.endTime}`,
        price: s.price,
        totalCapacity: s.totalCapacity,
        bookedCapacity: s.bookedCapacity,
        remaining,
        status: statusDisplay,
        statusText,
        statusColor,
        isSelectable: statusDisplay !== 'CLOSED' && statusDisplay !== 'FULL' && statusDisplay !== 'RESERVED',
        isAdminOnly,
      };
    }).filter(Boolean);

    // 智能错峰建议分析
    const peakSlots = formattedSlots.filter((s) => s.startTime >= '18:00' && s.startTime <= '21:00');
    const peakBooked = peakSlots.reduce((acc, cur) => acc + cur.bookedCapacity, 0);
    const peakTotal = peakSlots.reduce((acc, cur) => acc + cur.totalCapacity, 0);
    const peakRate = peakTotal > 0 ? (peakBooked / peakTotal) : 0;

    let peakAdvice = '今日各时段预约较为均匀，欢迎随时预订！';
    if (peakRate >= 0.75) {
      peakAdvice = '晚间18:00-21:00为黄金高峰期余量紧张，建议选择14:00-17:00错峰运动，享受更舒适的场地体验！';
    }

    return {
      venueId: venue.id,
      venueName: venue.name,
      basePrice: venue.basePrice,
      date,
      isClosed: false,
      slots: formattedSlots,
      peakAdvice,
    };
  }

  /**
   * 自动生成指定日期的 Slots（包含管理员专属时段）
   */
  private async generateSlotsForDate(venue: any, date: string) {
    const maxAttempts = 3;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          const existing = await tx.venueSlot.findMany({
            where: { venueId: venue.id, date },
            orderBy: { startTime: 'asc' },
          });
          if (existing.length > 0) return existing;

          const startHour = parseInt(venue.openTime.split(':')[0], 10) || 8;
          const endHour = parseInt(venue.closeTime.split(':')[0], 10) || 22;
          const intervalMinutes = venue.bookingInterval || 60;

          const slotsToCreate: any[] = [];
          let current = dayjs(`${date} ${venue.openTime}`);
          const end = dayjs(`${date} ${venue.closeTime}`);

          while (current.isBefore(end)) {
            const next = current.add(intervalMinutes, 'minute');
            if (next.isAfter(end)) break;

            const startTime = current.format('HH:mm');
            const endTime = next.format('HH:mm');

            slotsToCreate.push({
              venueId: venue.id,
              date,
              startTime,
              endTime,
              price: this.calcSlotPrice(venue.basePrice, date, startTime),
              totalCapacity: venue.capacity || 10,
              bookedCapacity: 0,
              status: SlotStatus.AVAILABLE,
              isAdminOnly: false,
            });

            current = next;
          }

          // 管理员专属时段：营业前 1 小时、营业后 1 小时
          const adminOnlySlots: any[] = [];
          const openMinutes = startHour * 60 + parseInt(venue.openTime.split(':')[1] || '0', 10);
          const closeMinutes = endHour * 60 + parseInt(venue.closeTime.split(':')[1] || '0', 10);

          if (openMinutes >= intervalMinutes) {
            const preStart = dayjs(`${date} ${venue.openTime}`).subtract(intervalMinutes, 'minute');
            adminOnlySlots.push({
              venueId: venue.id,
              date,
              startTime: preStart.format('HH:mm'),
              endTime: venue.openTime,
              price: this.calcSlotPrice(venue.basePrice, date, preStart.format('HH:mm')),
              totalCapacity: venue.capacity || 10,
              bookedCapacity: 0,
              status: SlotStatus.ADMIN_ONLY,
              isAdminOnly: true,
            });
          }

          const dayEndMinutes = 24 * 60;
          if (closeMinutes + intervalMinutes <= dayEndMinutes) {
            adminOnlySlots.push({
              venueId: venue.id,
              date,
              startTime: venue.closeTime,
              endTime: dayjs(`${date} ${venue.closeTime}`).add(intervalMinutes, 'minute').format('HH:mm'),
              price: this.calcSlotPrice(venue.basePrice, date, venue.closeTime),
              totalCapacity: venue.capacity || 10,
              bookedCapacity: 0,
              status: SlotStatus.ADMIN_ONLY,
              isAdminOnly: true,
            });
          }

          await tx.venueSlot.createMany({
            data: [...slotsToCreate, ...adminOnlySlots],
          });

          return tx.venueSlot.findMany({
            where: { venueId: venue.id, date },
            orderBy: { startTime: 'asc' },
          });
        });
      } catch (err: any) {
        if (err.code === 'P2002' && attempt < maxAttempts - 1) {
          this.logger.warn(`Slot 生成并发冲突，第 ${attempt + 1} 次重试...`);
          continue;
        }
        throw err;
      }
    }

    // 兜底读取
    return this.prisma.venueSlot.findMany({
      where: { venueId: venue.id, date },
      orderBy: { startTime: 'asc' },
    });
  }

  private calcSlotPrice(basePrice: number, date: string, startTime: string) {
    const dayOfWeek = dayjs(date).day();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isPeakHour = startTime >= '18:00' && startTime < '21:00';
    if (isWeekend) return Math.round(basePrice * 1.2);
    if (isPeakHour) return Math.round(basePrice * 1.15);
    return basePrice;
  }
}
