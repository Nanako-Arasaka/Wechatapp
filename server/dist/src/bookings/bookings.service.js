"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var BookingsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma/prisma.service");
const create_booking_dto_1 = require("./dto/create-booking.dto");
const business_exception_1 = require("../common/exceptions/business.exception");
const mock_providers_1 = require("../common/providers/mock-providers");
const enums_1 = require("../common/enums");
const dayjs = require("dayjs");
let BookingsService = BookingsService_1 = class BookingsService {
    constructor(prisma, mockRefund, mockSms) {
        this.prisma = prisma;
        this.mockRefund = mockRefund;
        this.mockSms = mockSms;
        this.logger = new common_1.Logger(BookingsService_1.name);
    }
    async create(userId, dto, role = enums_1.Role.USER) {
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                return await this.doCreate(userId, dto, role);
            }
            catch (err) {
                const isUniqueViolation = err?.code === 'P2002' || (typeof err?.message === 'string' && err.message.includes('Unique constraint'));
                if (isUniqueViolation && attempt < 2) {
                    this.logger.warn(`预约编号冲突，第 ${attempt + 1} 次重试生成...`);
                    continue;
                }
                throw err;
            }
        }
        throw new business_exception_1.BusinessException('系统繁忙，请重试', business_exception_1.BusinessErrorCode.COMMON_ERROR);
    }
    async doCreate(userId, dto, role = enums_1.Role.USER) {
        const isAdmin = role === enums_1.Role.ADMIN || role === enums_1.Role.SUPER_ADMIN;
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new business_exception_1.BusinessException('用户不存在', business_exception_1.BusinessErrorCode.NOT_FOUND);
        }
        const now = dayjs();
        const dateStr = now.format('YYYYMMDDHHmmss');
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const bookingNo = `BK${dateStr}${randomSuffix}`;
        const bookingCode = `SV${now.format('YYYYMMDD')}${Math.floor(100000 + Math.random() * 900000)}`;
        const orderNo = `SV${dateStr}${randomSuffix}`;
        return await this.prisma.$transaction(async (tx) => {
            const slot = await tx.venueSlot.findUnique({
                where: { id: dto.slotId },
                include: { venue: true },
            });
            if (!slot) {
                throw new business_exception_1.BusinessException('所选预约时段不存在', business_exception_1.BusinessErrorCode.SLOT_NOT_FOUND);
            }
            if (slot.status === enums_1.SlotStatus.CLOSED) {
                throw new business_exception_1.BusinessException('该时段已暂停预约', business_exception_1.BusinessErrorCode.SLOT_CLOSED);
            }
            if (slot.venue.status !== enums_1.VenueStatus.ACTIVE) {
                throw new business_exception_1.BusinessException('该场馆已下架或维护中，暂不可预约', business_exception_1.BusinessErrorCode.VENUE_NOT_FOUND);
            }
            const closedDate = await tx.venueClosedDate.findFirst({
                where: { venueId: slot.venueId, date: slot.date },
            });
            if (closedDate) {
                throw new business_exception_1.BusinessException(`该场馆 ${slot.date} 临时闭馆（${closedDate.reason}），请选择其他日期`, business_exception_1.BusinessErrorCode.SLOT_CLOSED);
            }
            this.validateBookingTime(slot, isAdmin);
            if (slot.status === enums_1.SlotStatus.ADMIN_ONLY && !isAdmin) {
                throw new business_exception_1.BusinessException('该时段为管理员专属，普通用户不可预约', business_exception_1.BusinessErrorCode.FORBIDDEN);
            }
            const availableCapacity = Math.max(0, slot.totalCapacity - slot.bookedCapacity);
            let targetCapacity = slot.totalCapacity;
            if (availableCapacity < dto.quantity) {
                if (!isAdmin || !dto.privilege || dto.privilege === create_booking_dto_1.BookingPrivilege.NONE) {
                    this.logger.warn(`防超卖拦截触发: slotId=${slot.id}, 余量=${availableCapacity}, 尝试购买=${dto.quantity}`);
                    throw new business_exception_1.BusinessException(`该时段余量不足（当前仅剩 ${availableCapacity} 个名额），请重新选择时段`, business_exception_1.BusinessErrorCode.SLOT_CAPACITY_NOT_ENOUGH);
                }
                if (dto.privilege === create_booking_dto_1.BookingPrivilege.EXPAND) {
                    targetCapacity = slot.bookedCapacity + dto.quantity;
                }
                else if (dto.privilege === create_booking_dto_1.BookingPrivilege.RESERVE) {
                    targetCapacity = slot.bookedCapacity + dto.quantity;
                }
            }
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
                throw new business_exception_1.BusinessException('该时段余量不足（可能已被他人同时预约），请刷新后重新选择', business_exception_1.BusinessErrorCode.SLOT_CAPACITY_NOT_ENOUGH);
            }
            if (dto.courtNo !== undefined && dto.courtNo !== null) {
                if (dto.courtNo < 1 || dto.courtNo > slot.totalCapacity) {
                    throw new business_exception_1.BusinessException(`场地编号须在 1 ~ ${slot.totalCapacity} 之间`, business_exception_1.BusinessErrorCode.PARAM_INVALID);
                }
                if (dto.quantity !== 1) {
                    throw new business_exception_1.BusinessException('选择具体场地时预约数量只能为 1', business_exception_1.BusinessErrorCode.PARAM_INVALID);
                }
            }
            const freshSlot = await tx.venueSlot.findUnique({ where: { id: slot.id } });
            const newBookedCapacity = freshSlot.bookedCapacity;
            let newStatus = newBookedCapacity >= targetCapacity ? enums_1.SlotStatus.FULL : enums_1.SlotStatus.AVAILABLE;
            if (dto.privilege === create_booking_dto_1.BookingPrivilege.RESERVE) {
                newStatus = enums_1.SlotStatus.RESERVED;
            }
            else if (slot.status === enums_1.SlotStatus.ADMIN_ONLY) {
                newStatus = newBookedCapacity >= targetCapacity ? enums_1.SlotStatus.FULL : enums_1.SlotStatus.ADMIN_ONLY;
            }
            await tx.venueSlot.update({
                where: { id: slot.id },
                data: { status: newStatus },
            });
            const totalAmount = slot.price * dto.quantity;
            const expiredAt = now.add(15, 'minute').toDate();
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
                    status: enums_1.BookingStatus.PENDING_PAYMENT,
                    source: isAdmin ? enums_1.BookingSource.ADMIN : enums_1.BookingSource.USER,
                    bookingCode,
                    contactName: dto.contactName,
                    contactPhone: dto.contactPhone,
                    studentNo: dto.studentNo,
                    courtNo: dto.courtNo ?? null,
                    expiredAt,
                },
            });
            if (dto.courtNo !== undefined && dto.courtNo !== null) {
                try {
                    await tx.courtOccupancy.create({
                        data: { slotId: slot.id, courtNo: dto.courtNo, bookingId: booking.id },
                    });
                }
                catch (err) {
                    if (err?.code === 'P2002') {
                        throw new business_exception_1.BusinessException(`该场地的 ${slot.date} ${slot.startTime}-${slot.endTime} 时段刚被他人预约，请换一块场地`, business_exception_1.BusinessErrorCode.SLOT_ALREADY_FULL);
                    }
                    throw err;
                }
            }
            const order = await tx.order.create({
                data: {
                    orderNo,
                    userId,
                    bookingId: booking.id,
                    amount: totalAmount,
                    paidAmount: 0,
                    refundAmount: 0,
                    paymentStatus: enums_1.PaymentStatus.UNPAID,
                    orderStatus: enums_1.OrderStatus.PENDING_PAYMENT,
                },
            });
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
    async findOne(id, userId) {
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
            throw new business_exception_1.BusinessException('预约记录不存在', business_exception_1.BusinessErrorCode.BOOKING_NOT_FOUND);
        }
        if (userId && booking.userId !== userId) {
            throw new business_exception_1.BusinessException('无权查看该预约', business_exception_1.BusinessErrorCode.FORBIDDEN);
        }
        return booking;
    }
    async cancel(id, userId, operatorRole = 'USER') {
        const preCheck = await this.prisma.booking.findUnique({
            where: { id },
        });
        if (!preCheck) {
            throw new business_exception_1.BusinessException('预约记录不存在', business_exception_1.BusinessErrorCode.BOOKING_NOT_FOUND);
        }
        if (operatorRole === 'USER' && preCheck.userId !== userId) {
            throw new business_exception_1.BusinessException('无权操作该预约', business_exception_1.BusinessErrorCode.FORBIDDEN);
        }
        return await this.prisma.$transaction(async (tx) => {
            const booking = await tx.booking.findUnique({
                where: { id },
                include: {
                    order: true,
                    slot: true,
                    venue: true,
                },
            });
            if (!booking) {
                throw new business_exception_1.BusinessException('预约记录不存在', business_exception_1.BusinessErrorCode.BOOKING_NOT_FOUND);
            }
            if (booking.status === enums_1.BookingStatus.CHECKED_IN || booking.status === enums_1.BookingStatus.COMPLETED) {
                throw new business_exception_1.BusinessException('已核销或已完成的预约无法取消', business_exception_1.BusinessErrorCode.BOOKING_CANNOT_CANCEL);
            }
            if (booking.status === enums_1.BookingStatus.CANCELLED || booking.status === enums_1.BookingStatus.REFUNDED) {
                throw new business_exception_1.BusinessException('该预约已处于取消/已退款状态，请勿重复操作', business_exception_1.BusinessErrorCode.BOOKING_STATUS_INVALID);
            }
            if (booking.status === enums_1.BookingStatus.EXPIRED) {
                throw new business_exception_1.BusinessException('该订单已超时关闭，库存已自动释放，无需取消', business_exception_1.BusinessErrorCode.BOOKING_STATUS_INVALID);
            }
            const isPaid = booking.order && booking.order.paymentStatus === enums_1.PaymentStatus.PAID;
            const targetStatus = isPaid ? enums_1.BookingStatus.REFUNDED : enums_1.BookingStatus.CANCELLED;
            const transition = await tx.booking.updateMany({
                where: {
                    id: booking.id,
                    status: { in: [enums_1.BookingStatus.PENDING_PAYMENT, enums_1.BookingStatus.CONFIRMED] },
                },
                data: {
                    status: targetStatus,
                    cancelledAt: new Date(),
                },
            });
            if (transition.count === 0) {
                throw new business_exception_1.BusinessException('该预约状态已变更，请勿重复操作', business_exception_1.BusinessErrorCode.BOOKING_STATUS_INVALID);
            }
            if (booking.slot) {
                await tx.venueSlot.updateMany({
                    where: {
                        id: booking.slot.id,
                        bookedCapacity: { gte: booking.quantity },
                    },
                    data: { bookedCapacity: { decrement: booking.quantity } },
                });
                const slot = await tx.venueSlot.findUnique({ where: { id: booking.slot.id } });
                if (slot) {
                    const newBooked = slot.bookedCapacity;
                    let status = slot.status;
                    if (status !== enums_1.SlotStatus.CLOSED && status !== enums_1.SlotStatus.OUT_OF_HOURS && status !== enums_1.SlotStatus.RESERVED) {
                        status = newBooked >= slot.totalCapacity ? enums_1.SlotStatus.FULL : enums_1.SlotStatus.AVAILABLE;
                    }
                    if (status === enums_1.SlotStatus.RESERVED && newBooked === 0) {
                        status = enums_1.SlotStatus.AVAILABLE;
                    }
                    if (status !== slot.status) {
                        await tx.venueSlot.update({
                            where: { id: slot.id },
                            data: { status },
                        });
                    }
                }
            }
            await tx.courtOccupancy.deleteMany({ where: { bookingId: booking.id } });
            let refundRecord = null;
            if (isPaid && booking.order) {
                const refundResult = await this.mockRefund.processRefund(booking.order.orderNo, booking.order.paidAmount, '用户主动取消预约退款');
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
                await tx.order.update({
                    where: { id: booking.order.id },
                    data: {
                        refundAmount: booking.order.paidAmount,
                        paymentStatus: enums_1.PaymentStatus.REFUNDED,
                        orderStatus: enums_1.OrderStatus.REFUNDED,
                        cancelledAt: new Date(),
                    },
                });
            }
            else if (booking.order) {
                await tx.order.update({
                    where: { id: booking.order.id },
                    data: {
                        orderStatus: enums_1.OrderStatus.CANCELLED,
                        cancelledAt: new Date(),
                    },
                });
            }
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
    validateBookingTime(slot, isAdmin) {
        const venue = slot.venue;
        const today = dayjs().format('YYYY-MM-DD');
        if (slot.date < today) {
            throw new business_exception_1.BusinessException('不能预约历史日期', business_exception_1.BusinessErrorCode.BOOKING_TIME_INVALID);
        }
        const maxBookDate = dayjs().add(venue.advanceDays || 7, 'day').format('YYYY-MM-DD');
        if (slot.date > maxBookDate) {
            throw new business_exception_1.BusinessException(`最多可提前 ${venue.advanceDays || 7} 天预约`, business_exception_1.BusinessErrorCode.BOOKING_TIME_INVALID);
        }
        if (slot.date === today) {
            const nowStr = dayjs().format('HH:mm');
            if (slot.startTime <= nowStr) {
                throw new business_exception_1.BusinessException('该时段已开始或已结束，无法预约', business_exception_1.BusinessErrorCode.BOOKING_TIME_INVALID);
            }
        }
    }
};
exports.BookingsService = BookingsService;
exports.BookingsService = BookingsService = BookingsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        mock_providers_1.MockRefundProvider,
        mock_providers_1.MockSmsProvider])
], BookingsService);
//# sourceMappingURL=bookings.service.js.map