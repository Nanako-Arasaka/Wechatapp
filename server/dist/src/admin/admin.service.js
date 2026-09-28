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
var AdminService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = require("bcryptjs");
const prisma_service_1 = require("../common/prisma/prisma.service");
const business_exception_1 = require("../common/exceptions/business.exception");
const enums_1 = require("../common/enums");
const dayjs = require("dayjs");
let AdminService = AdminService_1 = class AdminService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(AdminService_1.name);
    }
    async getVenues(page = 1, pageSize = 20, keyword) {
        const skip = (page - 1) * pageSize;
        const today = dayjs().format('YYYY-MM-DD');
        const where = {
            status: { not: 'DELETED' },
        };
        if (keyword) {
            where.OR = [
                { name: { contains: keyword } },
                { address: { contains: keyword } },
                { type: { contains: keyword } },
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
                    bookings: {
                        where: { bookingDate: today },
                    },
                    slots: {
                        where: { date: today },
                    },
                },
            }),
        ]);
        const list = venues.map((v) => {
            const todayBookingsCount = v.bookings.length;
            const todayIncome = v.bookings.reduce((sum, b) => sum + b.totalAmount, 0);
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
                todayBookingsCount,
                todayIncome: Math.round(todayIncome / 100),
                createdAt: v.createdAt,
            };
        });
        return { list, total, page, pageSize };
    }
    async createVenue(dto, operatorId) {
        const venue = await this.prisma.venue.create({
            data: {
                name: dto.name,
                type: dto.type,
                description: dto.description,
                address: dto.address,
                coverImage: dto.coverImage,
                basePrice: dto.basePrice,
                capacity: dto.capacity,
                openTime: dto.openTime,
                closeTime: dto.closeTime,
                facilities: dto.facilities || '中央空调,储物柜,淋浴间',
                rules: dto.rules || '支持提前7天预约，开场前2小时可免费取消。',
                status: 'ACTIVE',
            },
        });
        await this.prisma.operationLog.create({
            data: {
                operatorId,
                action: 'CREATE_VENUE',
                module: 'VENUE',
                targetId: venue.id,
                description: `新增场馆【${venue.name}】（${venue.type}，单价 ¥${venue.basePrice / 100}）`,
            },
        });
        return venue;
    }
    async updateVenue(id, dto, operatorId) {
        const venue = await this.prisma.venue.findUnique({ where: { id } });
        if (!venue || venue.status === 'DELETED') {
            throw new business_exception_1.BusinessException('场馆不存在', business_exception_1.BusinessErrorCode.VENUE_NOT_FOUND);
        }
        if (dto.status === 'DELETED') {
            throw new business_exception_1.BusinessException('删除/下架场馆请使用删除接口（会自动取消未来预约并退款），不允许直接修改状态为 DELETED', business_exception_1.BusinessErrorCode.PARAM_INVALID);
        }
        const updated = await this.prisma.venue.update({
            where: { id },
            data: {
                ...dto,
            },
        });
        if (dto.basePrice !== undefined || dto.capacity !== undefined) {
            await this.syncFutureSlotConfig(id, updated.basePrice, updated.capacity);
        }
        if (dto.openTime !== undefined || dto.closeTime !== undefined) {
            await this.rebuildFutureSlots(id, operatorId);
        }
        await this.prisma.operationLog.create({
            data: {
                operatorId,
                action: 'UPDATE_VENUE',
                module: 'VENUE',
                targetId: id,
                description: `修改场馆【${updated.name}】配置`,
            },
        });
        return updated;
    }
    async previewTimeChange(id, openTime, closeTime) {
        const venue = await this.prisma.venue.findUnique({ where: { id } });
        if (!venue || venue.status === 'DELETED') {
            throw new business_exception_1.BusinessException('场馆不存在', business_exception_1.BusinessErrorCode.VENUE_NOT_FOUND);
        }
        const today = dayjs().format('YYYY-MM-DD');
        const futureSlots = await this.prisma.venueSlot.findMany({
            where: { venueId: id, date: { gte: today } },
            orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        });
        const newSlotRanges = this.buildSlotRanges(openTime, closeTime, venue.bookingInterval || 60);
        let toAdd = 0;
        let toRemove = 0;
        let keepWithBooking = 0;
        const existingMap = new Map(futureSlots.map((s) => [`${s.date}|${s.startTime}-${s.endTime}`, s]));
        const newKeys = new Set();
        for (const [, slots] of this.groupByDate(futureSlots)) {
            const date = slots[0].date;
            for (const range of newSlotRanges) {
                const key = `${date}|${range.start}-${range.end}`;
                newKeys.add(key);
                if (!existingMap.has(key))
                    toAdd++;
            }
        }
        for (const slot of futureSlots) {
            const key = `${slot.date}|${slot.startTime}-${slot.endTime}`;
            if (!newKeys.has(key)) {
                if (slot.bookedCapacity > 0) {
                    keepWithBooking++;
                }
                else {
                    toRemove++;
                }
            }
        }
        if (futureSlots.length === 0) {
            toAdd = newSlotRanges.length;
        }
        return {
            venueId: id,
            originalOpenTime: venue.openTime,
            originalCloseTime: venue.closeTime,
            newOpenTime: openTime,
            newCloseTime: closeTime,
            toAdd,
            toRemove,
            keepWithBooking,
            message: `将新增 ${toAdd} 个时段，删除 ${toRemove} 个空时段，已有人预约保留 ${keepWithBooking} 个时段。`,
        };
    }
    async deleteVenue(id, operatorId) {
        const venue = await this.prisma.venue.findUnique({ where: { id } });
        if (!venue || venue.status === 'DELETED') {
            throw new business_exception_1.BusinessException('场馆不存在', business_exception_1.BusinessErrorCode.VENUE_NOT_FOUND);
        }
        const today = dayjs().format('YYYY-MM-DD');
        let cancelledCount = 0;
        await this.prisma.$transaction(async (tx) => {
            const futureBookings = await tx.booking.findMany({
                where: {
                    venueId: id,
                    bookingDate: { gte: today },
                    status: { in: [enums_1.BookingStatus.PENDING_PAYMENT, enums_1.BookingStatus.CONFIRMED] },
                },
                include: { order: true, slot: true, venue: true },
            });
            cancelledCount = futureBookings.length;
            for (const booking of futureBookings) {
                await this.cancelBookingInTx(tx, booking, operatorId, '场馆下架自动取消');
            }
            await tx.venue.update({
                where: { id },
                data: { status: 'DELETED' },
            });
        });
        await this.prisma.operationLog.create({
            data: {
                operatorId,
                action: 'DELETE_VENUE',
                module: 'VENUE',
                targetId: id,
                description: `下架并软删除场馆【${venue.name}】，同步取消未来 ${cancelledCount} 笔预约`,
            },
        });
        return { message: '场馆已成功删除/下架' };
    }
    async batchUpdateTime(openTime, closeTime, operatorId) {
        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
        if (!timeRegex.test(openTime) || !timeRegex.test(closeTime)) {
            throw new business_exception_1.BusinessException('时间格式必须为 HH:mm', business_exception_1.BusinessErrorCode.PARAM_INVALID);
        }
        const [oh, om] = openTime.split(':').map(Number);
        const [ch, cm] = closeTime.split(':').map(Number);
        if (ch * 60 + cm - (oh * 60 + om) < 60) {
            throw new business_exception_1.BusinessException('结束时间须晚于开始时间且间隔≥1小时', business_exception_1.BusinessErrorCode.PARAM_INVALID);
        }
        const venues = await this.prisma.venue.findMany({
            where: { status: { not: 'DELETED' } },
        });
        for (const venue of venues) {
            await this.prisma.venue.update({
                where: { id: venue.id },
                data: { openTime, closeTime },
            });
            await this.rebuildFutureSlots(venue.id, operatorId);
        }
        await this.prisma.operationLog.create({
            data: {
                operatorId,
                action: 'BATCH_UPDATE_TIME',
                module: 'VENUE',
                targetId: '',
                description: `批量调整 ${venues.length} 个场馆营业时间为 ${openTime}-${closeTime}`,
            },
        });
        return { updatedCount: venues.length, openTime, closeTime };
    }
    async setClosedDate(venueId, startDate, endDate, reason, operatorId) {
        const venue = await this.prisma.venue.findUnique({ where: { id: venueId } });
        if (!venue) {
            throw new business_exception_1.BusinessException('场馆不存在', business_exception_1.BusinessErrorCode.VENUE_NOT_FOUND);
        }
        const start = dayjs(startDate);
        const end = dayjs(endDate);
        if (!start.isValid() || !end.isValid()) {
            throw new business_exception_1.BusinessException('日期格式不正确', business_exception_1.BusinessErrorCode.PARAM_INVALID);
        }
        if (end.isBefore(start)) {
            throw new business_exception_1.BusinessException('结束日期不能早于开始日期', business_exception_1.BusinessErrorCode.PARAM_INVALID);
        }
        if (start.isBefore(dayjs().startOf('day'))) {
            throw new business_exception_1.BusinessException('不能闭馆过去的日期', business_exception_1.BusinessErrorCode.PARAM_INVALID);
        }
        const dates = [];
        let cursor = start.clone();
        while (cursor.isSame(end) || cursor.isBefore(end)) {
            dates.push(cursor.format('YYYY-MM-DD'));
            cursor = cursor.add(1, 'day');
        }
        await this.prisma.$transaction(async (tx) => {
            for (const date of dates) {
                const exists = await tx.venueClosedDate.findFirst({
                    where: { venueId, date },
                });
                if (!exists) {
                    await tx.venueClosedDate.create({
                        data: {
                            venueId,
                            date,
                            reason: reason || '临时维护保养',
                        },
                    });
                }
            }
            for (const date of dates) {
                const dayBookings = await tx.booking.findMany({
                    where: {
                        venueId,
                        bookingDate: date,
                        status: { in: [enums_1.BookingStatus.PENDING_PAYMENT, enums_1.BookingStatus.CONFIRMED] },
                    },
                    include: { order: true, slot: true, venue: true },
                });
                for (const booking of dayBookings) {
                    await this.cancelBookingInTx(tx, booking, operatorId, `场馆 ${date} 临时闭馆：${reason}`);
                }
                await tx.venueSlot.updateMany({
                    where: { venueId, date },
                    data: { status: enums_1.SlotStatus.CLOSED },
                });
            }
        });
        await this.prisma.operationLog.create({
            data: {
                operatorId,
                action: 'SET_CLOSED_DATE',
                module: 'VENUE',
                targetId: venueId,
                description: `设置场馆【${venue.name}】在 ${startDate} 至 ${endDate} 临时闭馆：${reason}`,
            },
        });
        return { venueId, startDate, endDate, closedDays: dates.length, reason };
    }
    async reopenVenue(venueId, operatorId) {
        const venue = await this.prisma.venue.findUnique({ where: { id: venueId } });
        if (!venue) {
            throw new business_exception_1.BusinessException('场馆不存在', business_exception_1.BusinessErrorCode.VENUE_NOT_FOUND);
        }
        const today = dayjs().format('YYYY-MM-DD');
        await this.prisma.$transaction(async (tx) => {
            await tx.venueClosedDate.deleteMany({
                where: {
                    venueId,
                    date: { gte: today },
                },
            });
            await tx.venueSlot.updateMany({
                where: {
                    venueId,
                    date: { gte: today },
                    status: enums_1.SlotStatus.CLOSED,
                    bookedCapacity: 0,
                },
                data: { status: enums_1.SlotStatus.AVAILABLE },
            });
            await tx.venueSlot.updateMany({
                where: {
                    venueId,
                    date: { gte: today },
                    status: enums_1.SlotStatus.CLOSED,
                    bookedCapacity: { gt: 0 },
                },
                data: { status: enums_1.SlotStatus.FULL },
            });
            if (venue.status !== 'ACTIVE' && venue.status !== 'DELETED') {
                await tx.venue.update({
                    where: { id: venueId },
                    data: { status: 'ACTIVE' },
                });
            }
        });
        await this.prisma.operationLog.create({
            data: {
                operatorId,
                action: 'REOPEN_VENUE',
                module: 'VENUE',
                targetId: venueId,
                description: `场馆【${venue.name}】直接开馆：清除未来临时闭馆并恢复上架`,
            },
        });
        return { venueId, reopenedAt: new Date() };
    }
    async getBookings(page = 1, pageSize = 20, venueId, date, status, keyword) {
        const skip = (page - 1) * pageSize;
        const where = {};
        if (venueId)
            where.venueId = venueId;
        if (date)
            where.bookingDate = date;
        if (status && status !== 'ALL')
            where.status = status;
        if (keyword) {
            where.OR = [
                { bookingNo: { contains: keyword } },
                { bookingCode: { contains: keyword } },
                { contactName: { contains: keyword } },
                { contactPhone: { contains: keyword } },
            ];
        }
        const [total, bookings] = await Promise.all([
            this.prisma.booking.count({ where }),
            this.prisma.booking.findMany({
                where,
                skip,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: true,
                    venue: true,
                    slot: true,
                    order: true,
                    checkinRecords: {
                        include: { operator: true },
                    },
                },
            }),
        ]);
        const list = bookings.map((b) => ({
            id: b.id,
            bookingNo: b.bookingNo,
            bookingCode: b.bookingCode,
            userName: b.contactName || b.user.nickname,
            userPhone: b.contactPhone || b.user.phone,
            venueName: b.venue.name,
            bookingDate: b.bookingDate,
            timeRange: `${b.startTime}-${b.endTime}`,
            courtNo: b.courtNo,
            quantity: b.quantity,
            unitPrice: b.unitPrice,
            totalAmount: b.totalAmount,
            status: b.status,
            source: b.source,
            paymentStatus: b.order?.paymentStatus || 'UNPAID',
            checkedInAt: b.checkedInAt,
            cancelledAt: b.cancelledAt,
            createdAt: b.createdAt,
        }));
        return { list, total, page, pageSize };
    }
    async getLogs(page = 1, pageSize = 20) {
        const skip = (page - 1) * pageSize;
        const [total, logs] = await Promise.all([
            this.prisma.operationLog.count(),
            this.prisma.operationLog.findMany({
                skip,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
                include: { operator: true },
            }),
        ]);
        const list = logs.map((l) => ({
            id: l.id,
            operatorName: l.operator.nickname,
            operatorRole: l.operator.role,
            action: l.action,
            module: l.module,
            description: l.description,
            createdAt: l.createdAt,
        }));
        return { list, total, page, pageSize };
    }
    async syncFutureSlotConfig(venueId, basePrice, capacity) {
        const today = dayjs().format('YYYY-MM-DD');
        await this.prisma.$transaction(async (tx) => {
            const futureSlots = await tx.venueSlot.findMany({
                where: { venueId, date: { gte: today } },
            });
            for (const slot of futureSlots) {
                const dayOfWeek = dayjs(slot.date).day();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                const isPeakHour = slot.startTime >= '18:00' && slot.startTime < '21:00';
                let price = basePrice;
                if (isWeekend) {
                    price = Math.round(price * 1.2);
                }
                else if (isPeakHour) {
                    price = Math.round(price * 1.15);
                }
                if (slot.bookedCapacity === 0 && slot.status !== enums_1.SlotStatus.OUT_OF_HOURS) {
                    await tx.venueSlot.update({
                        where: { id: slot.id },
                        data: { price, totalCapacity: capacity },
                    });
                }
            }
        });
    }
    async rebuildFutureSlots(venueId, operatorId = 'SYSTEM') {
        const venue = await this.prisma.venue.findUnique({ where: { id: venueId } });
        if (!venue)
            return;
        const today = dayjs().format('YYYY-MM-DD');
        const maxDate = dayjs().add(venue.advanceDays || 7, 'day').format('YYYY-MM-DD');
        await this.prisma.$transaction(async (tx) => {
            const closedDates = await tx.venueClosedDate.findMany({
                where: { venueId, date: { gte: today, lte: maxDate } },
            });
            const closedDateSet = new Set(closedDates.map((cd) => cd.date));
            const existingSlots = await tx.venueSlot.findMany({
                where: { venueId, date: { gte: today, lte: maxDate } },
                include: { bookings: { include: { order: true } } },
            });
            const slotsByDate = this.groupByDate(existingSlots);
            const newRanges = this.buildSlotRanges(venue.openTime, venue.closeTime, venue.bookingInterval || 60);
            for (let d = 0; d <= (venue.advanceDays || 7); d++) {
                const date = dayjs().add(d, 'day').format('YYYY-MM-DD');
                if (date > maxDate)
                    break;
                if (closedDateSet.has(date))
                    continue;
                const dayExisting = slotsByDate.get(date) || [];
                const existingMap = new Map(dayExisting.map((s) => [`${s.startTime}-${s.endTime}`, s]));
                for (const range of newRanges) {
                    const key = `${range.start}-${range.end}`;
                    if (!existingMap.has(key)) {
                        await tx.venueSlot.create({
                            data: {
                                venueId,
                                date,
                                startTime: range.start,
                                endTime: range.end,
                                price: this.calcSlotPrice(venue.basePrice, date, range.start),
                                totalCapacity: venue.capacity,
                                bookedCapacity: 0,
                                status: enums_1.SlotStatus.AVAILABLE,
                            },
                        });
                    }
                }
                for (const slot of dayExisting) {
                    const key = `${slot.startTime}-${slot.endTime}`;
                    if (!newRanges.some((r) => `${r.start}-${r.end}` === key)) {
                        const activeBookings = slot.bookings.filter((b) => b.status === enums_1.BookingStatus.PENDING_PAYMENT || b.status === enums_1.BookingStatus.CONFIRMED);
                        for (const b of activeBookings) {
                            await this.cancelBookingInTx(tx, { ...b, slot, venue }, operatorId, `场馆营业时间调整为 ${venue.openTime}-${venue.closeTime}，原时段不再开放`);
                        }
                        if (slot.bookings.length > 0) {
                            await tx.venueSlot.update({
                                where: { id: slot.id },
                                data: { status: enums_1.SlotStatus.OUT_OF_HOURS },
                            });
                        }
                        else {
                            await tx.venueSlot.delete({ where: { id: slot.id } });
                        }
                    }
                }
            }
        });
    }
    async cancelBookingInTx(tx, booking, operatorId, reason) {
        const isPaid = booking.order && booking.order.paymentStatus === enums_1.PaymentStatus.PAID;
        const transition = await tx.booking.updateMany({
            where: {
                id: booking.id,
                status: { in: [enums_1.BookingStatus.PENDING_PAYMENT, enums_1.BookingStatus.CONFIRMED] },
            },
            data: {
                status: isPaid ? enums_1.BookingStatus.REFUNDED : enums_1.BookingStatus.CANCELLED,
                cancelledAt: new Date(),
            },
        });
        if (transition.count === 0) {
            this.logger.warn(`预约 ${booking.bookingNo} 状态已变更，跳过重复取消`);
            return;
        }
        await tx.courtOccupancy.deleteMany({ where: { bookingId: booking.id } });
        if (booking.slot) {
            await tx.venueSlot.updateMany({
                where: { id: booking.slot.id, bookedCapacity: { gte: booking.quantity } },
                data: { bookedCapacity: { decrement: booking.quantity } },
            });
            const slot = await tx.venueSlot.findUnique({ where: { id: booking.slot.id } });
            if (slot) {
                let status = slot.status;
                if (status !== enums_1.SlotStatus.CLOSED && status !== enums_1.SlotStatus.OUT_OF_HOURS) {
                    status = slot.bookedCapacity >= slot.totalCapacity ? enums_1.SlotStatus.FULL : enums_1.SlotStatus.AVAILABLE;
                }
                if (status !== slot.status) {
                    await tx.venueSlot.update({
                        where: { id: slot.id },
                        data: { status },
                    });
                }
            }
        }
        if (isPaid && booking.order) {
            await tx.refund.create({
                data: {
                    refundNo: `RF${dayjs().format('YYYYMMDDHHmmss')}${Math.floor(100000 + Math.random() * 900000)}`,
                    orderId: booking.order.id,
                    amount: booking.order.paidAmount,
                    reason,
                    status: 'SUCCESS',
                    completedAt: new Date(),
                },
            });
            await tx.order.updateMany({
                where: { id: booking.order.id, paymentStatus: enums_1.PaymentStatus.PAID },
                data: {
                    refundAmount: booking.order.paidAmount,
                    paymentStatus: enums_1.PaymentStatus.REFUNDED,
                    orderStatus: enums_1.OrderStatus.REFUNDED,
                    cancelledAt: new Date(),
                },
            });
        }
        else if (booking.order) {
            await tx.order.updateMany({
                where: { id: booking.order.id, orderStatus: enums_1.OrderStatus.PENDING_PAYMENT },
                data: { orderStatus: enums_1.OrderStatus.CANCELLED, cancelledAt: new Date() },
            });
        }
        await tx.notification.create({
            data: {
                userId: booking.userId,
                title: isPaid ? '退款成功通知' : '预约取消通知',
                content: isPaid
                    ? `您预约的【${booking.venue?.name || '场馆'}】因 ${reason} 已取消并全额退款 ¥${booking.totalAmount / 100}。`
                    : `您预约的【${booking.venue?.name || '场馆'}】因 ${reason} 已取消。`,
                type: isPaid ? 'REFUND' : 'CANCELLED',
            },
        });
        await tx.operationLog.create({
            data: {
                operatorId,
                action: 'CANCEL_BOOKING',
                module: 'BOOKING',
                targetId: booking.id,
                description: `系统取消预约 ${booking.bookingNo}，原因：${reason}`,
            },
        });
    }
    buildSlotRanges(openTime, closeTime, intervalMinutes) {
        const ranges = [];
        const today = dayjs().format('YYYY-MM-DD');
        let current = dayjs(`${today} ${openTime}`);
        const end = dayjs(`${today} ${closeTime}`);
        while (current.isBefore(end)) {
            const next = current.add(intervalMinutes, 'minute');
            if (next.isAfter(end))
                break;
            ranges.push({ start: current.format('HH:mm'), end: next.format('HH:mm') });
            current = next;
        }
        return ranges;
    }
    groupByDate(slots) {
        const map = new Map();
        for (const slot of slots) {
            if (!map.has(slot.date))
                map.set(slot.date, []);
            map.get(slot.date).push(slot);
        }
        return map;
    }
    calcSlotPrice(basePrice, date, startTime) {
        const dayOfWeek = dayjs(date).day();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isPeakHour = startTime >= '18:00' && startTime < '21:00';
        if (isWeekend)
            return Math.round(basePrice * 1.2);
        if (isPeakHour)
            return Math.round(basePrice * 1.15);
        return basePrice;
    }
    async createUser(dto, operatorId, operatorRole) {
        const targetRole = dto.role || enums_1.Role.USER;
        if (targetRole !== enums_1.Role.USER && operatorRole !== enums_1.Role.SUPER_ADMIN) {
            throw new business_exception_1.BusinessException('只有超级管理员可开通管理员账号', business_exception_1.BusinessErrorCode.FORBIDDEN);
        }
        const existed = await this.prisma.user.findUnique({
            where: { username: dto.username },
        });
        if (existed) {
            throw new business_exception_1.BusinessException('账号已存在', business_exception_1.BusinessErrorCode.USER_ALREADY_EXISTS);
        }
        const hashedPassword = await bcrypt.hash(dto.password, 10);
        const user = await this.prisma.user.create({
            data: {
                username: dto.username,
                password: hashedPassword,
                nickname: dto.nickname || dto.username,
                avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
                phone: dto.phone || '13800000000',
                role: targetRole,
                status: 'ACTIVE',
            },
        });
        await this.prisma.operationLog.create({
            data: {
                operatorId,
                action: 'CREATE_USER',
                module: 'USER',
                targetId: user.id,
                description: `创建账号 ${dto.username}，角色 ${targetRole}`,
            },
        });
        return {
            id: user.id,
            username: user.username,
            nickname: user.nickname,
            role: user.role,
            createdAt: user.createdAt,
        };
    }
    async getUsers(role, page = 1, pageSize = 50) {
        const skip = (page - 1) * pageSize;
        const where = { status: { not: 'DELETED' } };
        if (role) {
            where.role = role;
        }
        const [total, list] = await Promise.all([
            this.prisma.user.count({ where }),
            this.prisma.user.findMany({
                where,
                skip,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    username: true,
                    nickname: true,
                    phone: true,
                    role: true,
                    status: true,
                    createdAt: true,
                },
            }),
        ]);
        return { list, total, page, pageSize };
    }
    async deleteUser(id, operatorId, operatorRole) {
        if (id === operatorId) {
            throw new business_exception_1.BusinessException('不能删除当前登录账号', business_exception_1.BusinessErrorCode.FORBIDDEN);
        }
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user || user.status === 'DELETED') {
            throw new business_exception_1.BusinessException('用户不存在', business_exception_1.BusinessErrorCode.NOT_FOUND);
        }
        if (user.role !== enums_1.Role.USER && operatorRole !== enums_1.Role.SUPER_ADMIN) {
            throw new business_exception_1.BusinessException('只有超级管理员可删除管理员账号', business_exception_1.BusinessErrorCode.FORBIDDEN);
        }
        await this.prisma.user.update({
            where: { id },
            data: { status: 'DELETED', username: `${user.username}_deleted_${Date.now()}` },
        });
        await this.prisma.operationLog.create({
            data: {
                operatorId,
                action: 'DELETE_USER',
                module: 'USER',
                targetId: id,
                description: `删除账号 ${user.username}，角色 ${user.role}`,
            },
        });
        return { id, username: user.username };
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = AdminService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminService);
//# sourceMappingURL=admin.service.js.map