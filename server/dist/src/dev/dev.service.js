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
var DevService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DevService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../common/prisma/prisma.service");
const enums_1 = require("../common/enums");
const dayjs = require("dayjs");
let DevService = DevService_1 = class DevService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(DevService_1.name);
    }
    async handleExpiredOrdersCron() {
        try {
            const result = await this.expirePendingOrders();
            if (result.expiredCount > 0) {
                this.logger.log(`[定时任务] 自动过期 ${result.expiredCount} 笔超时待支付订单`);
            }
        }
        catch (err) {
            this.logger.error('[定时任务] 过期订单处理失败', err);
        }
    }
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
                const transition = await tx.booking.updateMany({
                    where: { id: b.id, status: 'PENDING_PAYMENT' },
                    data: { status: 'EXPIRED' },
                });
                if (transition.count === 0)
                    return;
                await tx.courtOccupancy.deleteMany({ where: { bookingId: b.id } });
                if (b.slot) {
                    await tx.venueSlot.updateMany({
                        where: { id: b.slot.id, bookedCapacity: { gte: b.quantity } },
                        data: { bookedCapacity: { decrement: b.quantity } },
                    });
                    const slot = await tx.venueSlot.findUnique({ where: { id: b.slot.id } });
                    if (slot) {
                        let status = slot.status;
                        if (status !== enums_1.SlotStatus.CLOSED &&
                            status !== enums_1.SlotStatus.OUT_OF_HOURS &&
                            status !== enums_1.SlotStatus.RESERVED &&
                            status !== enums_1.SlotStatus.ADMIN_ONLY) {
                            status = slot.bookedCapacity >= slot.totalCapacity ? enums_1.SlotStatus.FULL : enums_1.SlotStatus.AVAILABLE;
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
    async generatePeakTraffic() {
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
};
exports.DevService = DevService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_MINUTE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DevService.prototype, "handleExpiredOrdersCron", null);
exports.DevService = DevService = DevService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DevService);
//# sourceMappingURL=dev.service.js.map