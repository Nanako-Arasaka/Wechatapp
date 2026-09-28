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
var CheckinService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckinService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma/prisma.service");
const business_exception_1 = require("../common/exceptions/business.exception");
const enums_1 = require("../common/enums");
const dayjs = require("dayjs");
let CheckinService = CheckinService_1 = class CheckinService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(CheckinService_1.name);
    }
    async verifyCode(codeStr) {
        let cleanCode = codeStr.trim();
        if (cleanCode.startsWith('{') && cleanCode.endsWith('}')) {
            try {
                const parsed = JSON.parse(cleanCode);
                cleanCode = parsed.bookingCode || parsed.bookingNo || cleanCode;
            }
            catch (e) {
            }
        }
        else if (cleanCode.startsWith('smartvenue://booking/')) {
            cleanCode = cleanCode.replace('smartvenue://booking/', '');
        }
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
            throw new business_exception_1.BusinessException('无效的核销码或预约不存在', business_exception_1.BusinessErrorCode.QRCODE_INVALID);
        }
        if (booking.status === enums_1.BookingStatus.CHECKED_IN || booking.status === enums_1.BookingStatus.COMPLETED) {
            const lastCheckin = booking.checkinRecords[0];
            const checkinTimeStr = lastCheckin ? dayjs(lastCheckin.checkinAt).format('YYYY-MM-DD HH:mm:ss') : '此前';
            const operatorName = lastCheckin?.operator?.nickname || '工作人员';
            throw new business_exception_1.BusinessException(`该预约已于 ${checkinTimeStr} 由 [${operatorName}] 完成核销，请勿重复核销！`, business_exception_1.BusinessErrorCode.CHECKIN_ALREADY_DONE);
        }
        if (booking.status === enums_1.BookingStatus.CANCELLED || booking.status === enums_1.BookingStatus.REFUNDED) {
            throw new business_exception_1.BusinessException('该预约已处于取消/已退款状态，无法核销入场', business_exception_1.BusinessErrorCode.BOOKING_STATUS_INVALID);
        }
        if (booking.status === enums_1.BookingStatus.PENDING_PAYMENT) {
            throw new business_exception_1.BusinessException('该预约尚未完成支付，请先支付后再核销', business_exception_1.BusinessErrorCode.BOOKING_STATUS_INVALID);
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
    async confirmCheckin(bookingId, operatorId) {
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
            throw new business_exception_1.BusinessException('预约记录不存在', business_exception_1.BusinessErrorCode.BOOKING_NOT_FOUND);
        }
        if (booking.status === enums_1.BookingStatus.CHECKED_IN || booking.status === enums_1.BookingStatus.COMPLETED) {
            throw new business_exception_1.BusinessException('该预约已被核销，请勿重复核销', business_exception_1.BusinessErrorCode.CHECKIN_ALREADY_DONE);
        }
        if (booking.status !== enums_1.BookingStatus.CONFIRMED) {
            throw new business_exception_1.BusinessException('仅待使用的有效预约可进行核销', business_exception_1.BusinessErrorCode.BOOKING_STATUS_INVALID);
        }
        const now = new Date();
        return await this.prisma.$transaction(async (tx) => {
            const transition = await tx.booking.updateMany({
                where: { id: booking.id, status: enums_1.BookingStatus.CONFIRMED },
                data: {
                    status: enums_1.BookingStatus.CHECKED_IN,
                    checkedInAt: now,
                },
            });
            if (transition.count === 0) {
                throw new business_exception_1.BusinessException('该预约刚刚已被核销，请勿重复操作', business_exception_1.BusinessErrorCode.CHECKIN_ALREADY_DONE);
            }
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
            if (booking.order) {
                await tx.order.update({
                    where: { id: booking.order.id },
                    data: {
                        orderStatus: enums_1.OrderStatus.COMPLETED,
                    },
                });
            }
            await tx.operationLog.create({
                data: {
                    operatorId,
                    action: 'CHECKIN',
                    module: 'CHECKIN',
                    targetId: booking.id,
                    description: `管理员 [${operator?.nickname || operatorId}] 完成核销：预约号 ${booking.bookingNo}，场馆【${booking.venue.name}】`,
                },
            });
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
};
exports.CheckinService = CheckinService;
exports.CheckinService = CheckinService = CheckinService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CheckinService);
//# sourceMappingURL=checkin.service.js.map