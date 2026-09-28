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
var OrdersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma/prisma.service");
const business_exception_1 = require("../common/exceptions/business.exception");
const mock_providers_1 = require("../common/providers/mock-providers");
const enums_1 = require("../common/enums");
let OrdersService = OrdersService_1 = class OrdersService {
    constructor(prisma, mockWechatPay) {
        this.prisma = prisma;
        this.mockWechatPay = mockWechatPay;
        this.logger = new common_1.Logger(OrdersService_1.name);
    }
    async findAll(userId, status) {
        const where = { userId };
        if (status && status !== 'ALL') {
            if (status === 'PENDING_PAYMENT') {
                where.orderStatus = enums_1.OrderStatus.PENDING_PAYMENT;
            }
            else if (status === 'PAID' || status === 'CONFIRMED') {
                where.orderStatus = enums_1.OrderStatus.PAID;
                where.booking = { status: enums_1.BookingStatus.CONFIRMED };
            }
            else if (status === 'CHECKED_IN' || status === 'COMPLETED') {
                where.booking = { status: { in: [enums_1.BookingStatus.CHECKED_IN, enums_1.BookingStatus.COMPLETED] } };
            }
            else if (status === 'CANCELLED') {
                where.orderStatus = enums_1.OrderStatus.CANCELLED;
            }
            else if (status === 'REFUNDED') {
                where.orderStatus = enums_1.OrderStatus.REFUNDED;
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
    async findOne(id, userId) {
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
            throw new business_exception_1.BusinessException('订单不存在', business_exception_1.BusinessErrorCode.ORDER_NOT_FOUND);
        }
        if (order.userId !== userId) {
            throw new business_exception_1.BusinessException('无权查看该订单', business_exception_1.BusinessErrorCode.FORBIDDEN);
        }
        return order;
    }
    async pay(id, userId) {
        const order = await this.prisma.order.findUnique({
            where: { id },
            include: {
                booking: {
                    include: { venue: true, slot: true },
                },
            },
        });
        if (!order) {
            throw new business_exception_1.BusinessException('订单不存在', business_exception_1.BusinessErrorCode.ORDER_NOT_FOUND);
        }
        if (order.userId !== userId) {
            throw new business_exception_1.BusinessException('无权支付该订单', business_exception_1.BusinessErrorCode.FORBIDDEN);
        }
        if (order.paymentStatus === enums_1.PaymentStatus.PAID) {
            throw new business_exception_1.BusinessException('订单已支付，请勿重复操作', business_exception_1.BusinessErrorCode.ORDER_ALREADY_PAID);
        }
        if (order.orderStatus === enums_1.OrderStatus.CANCELLED || order.orderStatus === enums_1.OrderStatus.EXPIRED) {
            throw new business_exception_1.BusinessException('订单已关闭或超时过期', business_exception_1.BusinessErrorCode.ORDER_PAY_FAILED);
        }
        if (order.booking.expiredAt && new Date(order.booking.expiredAt).getTime() <= Date.now()) {
            await this.expireOrderInline(order);
            throw new business_exception_1.BusinessException('订单已超时关闭，请重新预约', business_exception_1.BusinessErrorCode.ORDER_PAY_FAILED);
        }
        const payResult = await this.mockWechatPay.createPayment(order.orderNo, order.amount);
        return await this.prisma.$transaction(async (tx) => {
            const transition = await tx.order.updateMany({
                where: {
                    id: order.id,
                    orderStatus: enums_1.OrderStatus.PENDING_PAYMENT,
                    paymentStatus: enums_1.PaymentStatus.UNPAID,
                },
                data: {
                    paidAmount: order.amount,
                    paymentStatus: enums_1.PaymentStatus.PAID,
                    orderStatus: enums_1.OrderStatus.PAID,
                    paidAt: payResult.paidAt,
                },
            });
            if (transition.count === 0) {
                throw new business_exception_1.BusinessException('订单状态已变更（可能已支付或已关闭），请勿重复支付', business_exception_1.BusinessErrorCode.ORDER_ALREADY_PAID);
            }
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
            await tx.booking.updateMany({
                where: { id: order.booking.id, status: enums_1.BookingStatus.PENDING_PAYMENT },
                data: {
                    status: enums_1.BookingStatus.CONFIRMED,
                },
            });
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
    async expireOrderInline(order) {
        await this.prisma.$transaction(async (tx) => {
            const transition = await tx.booking.updateMany({
                where: { id: order.booking.id, status: enums_1.BookingStatus.PENDING_PAYMENT },
                data: { status: enums_1.BookingStatus.EXPIRED },
            });
            if (transition.count === 0)
                return;
            await tx.order.updateMany({
                where: { id: order.id, orderStatus: enums_1.OrderStatus.PENDING_PAYMENT },
                data: { orderStatus: enums_1.OrderStatus.EXPIRED },
            });
            if (order.booking.slotId) {
                await tx.venueSlot.updateMany({
                    where: { id: order.booking.slotId, bookedCapacity: { gte: order.booking.quantity } },
                    data: { bookedCapacity: { decrement: order.booking.quantity } },
                });
                const slot = await tx.venueSlot.findUnique({ where: { id: order.booking.slotId } });
                if (slot && slot.status === 'FULL' && slot.bookedCapacity < slot.totalCapacity) {
                    await tx.venueSlot.update({ where: { id: slot.id }, data: { status: 'AVAILABLE' } });
                }
            }
        });
        this.logger.log(`[订单过期] 订单 ${order.orderNo} 支付时已超截止时间，已就地过期并释放库存`);
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = OrdersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        mock_providers_1.MockWechatPayProvider])
], OrdersService);
//# sourceMappingURL=orders.service.js.map