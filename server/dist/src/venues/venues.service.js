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
var VenuesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VenuesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma/prisma.service");
const business_exception_1 = require("../common/exceptions/business.exception");
const enums_1 = require("../common/enums");
const dayjs = require("dayjs");
let VenuesService = VenuesService_1 = class VenuesService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(VenuesService_1.name);
    }
    async findAll(query) {
        const today = dayjs().format('YYYY-MM-DD');
        const targetDate = query.date || today;
        const page = query.page || 1;
        const pageSize = query.pageSize || 20;
        const skip = (page - 1) * pageSize;
        const where = {
            status: {
                not: enums_1.VenueStatus.DELETED,
            },
        };
        if (query.type) {
            where.type = query.type;
        }
        if (query.status) {
            where.status = query.status;
        }
        else {
            where.status = enums_1.VenueStatus.ACTIVE;
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
            const activeSlots = v.slots.filter((s) => s.status !== enums_1.SlotStatus.CLOSED);
            const availableSlotsCount = activeSlots.filter((s) => s.totalCapacity > s.bookedCapacity).length;
            const totalCapacity = activeSlots.reduce((acc, cur) => acc + cur.totalCapacity, 0);
            const bookedCapacity = activeSlots.reduce((acc, cur) => acc + cur.bookedCapacity, 0);
            const totalRemaining = Math.max(0, totalCapacity - bookedCapacity);
            const utilizationRate = totalCapacity > 0 ? Math.round((bookedCapacity / totalCapacity) * 100) : 0;
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
        list.sort((a, b) => b.recommendScore - a.recommendScore);
        return { list, total, page, pageSize };
    }
    async findOne(id) {
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
        if (!venue || venue.status === enums_1.VenueStatus.DELETED) {
            throw new business_exception_1.BusinessException('场馆不存在或已下架', business_exception_1.BusinessErrorCode.VENUE_NOT_FOUND);
        }
        const totalBookings = await this.prisma.booking.count({
            where: { venueId: id, status: { notIn: [enums_1.BookingStatus.CANCELLED, enums_1.BookingStatus.REFUNDED] } },
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
    async getSlotCourts(venueId, slotId) {
        const slot = await this.prisma.venueSlot.findUnique({
            where: { id: slotId },
            include: { venue: true },
        });
        if (!slot || slot.venueId !== venueId) {
            throw new business_exception_1.BusinessException('时段不存在', business_exception_1.BusinessErrorCode.SLOT_NOT_FOUND);
        }
        if (slot.venue.status === enums_1.VenueStatus.DELETED) {
            throw new business_exception_1.BusinessException('场馆不存在或已下架', business_exception_1.BusinessErrorCode.VENUE_NOT_FOUND);
        }
        const [occupancies, legacyCount] = await Promise.all([
            this.prisma.courtOccupancy.findMany({
                where: { slotId },
                select: { courtNo: true },
            }),
            this.prisma.booking.count({
                where: {
                    slotId,
                    courtNo: null,
                    status: { notIn: [enums_1.BookingStatus.CANCELLED, enums_1.BookingStatus.REFUNDED] },
                },
            }),
        ]);
        const occupied = occupancies.map((o) => o.courtNo);
        const occupiedSet = new Set(occupied);
        let nextNo = 1;
        while (legacyCount > 0 && occupied.length < slot.bookedCapacity && nextNo <= slot.totalCapacity) {
            if (!occupiedSet.has(nextNo)) {
                occupied.push(nextNo);
                occupiedSet.add(nextNo);
            }
            nextNo++;
        }
        return {
            slotId: slot.id,
            date: slot.date,
            timeRange: `${slot.startTime}-${slot.endTime}`,
            totalCapacity: slot.totalCapacity,
            bookedCapacity: slot.bookedCapacity,
            occupied: occupied.sort((a, b) => a - b),
        };
    }
    async getAvailability(venueId, dateStr, isAdmin = false) {
        const venue = await this.prisma.venue.findUnique({
            where: { id: venueId },
            include: {
                closedDates: true,
            },
        });
        if (!venue || venue.status === enums_1.VenueStatus.DELETED) {
            throw new business_exception_1.BusinessException('场馆不存在', business_exception_1.BusinessErrorCode.VENUE_NOT_FOUND);
        }
        const date = (dateStr && dateStr !== 'undefined' && dateStr !== 'null')
            ? dateStr
            : dayjs().format('YYYY-MM-DD');
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
        let slots = await this.prisma.venueSlot.findMany({
            where: {
                venueId,
                date,
            },
            orderBy: { startTime: 'asc' },
        });
        if (slots.length === 0) {
            slots = await this.generateSlotsForDate(venue, date);
        }
        const now = dayjs();
        const isToday = date === now.format('YYYY-MM-DD');
        const currentHourMinute = now.format('HH:mm');
        const formattedSlots = slots.map((s) => {
            const remaining = Math.max(0, s.totalCapacity - s.bookedCapacity);
            const isPast = isToday && s.startTime < currentHourMinute;
            const isAdminOnly = s.status === enums_1.SlotStatus.ADMIN_ONLY || s.isAdminOnly;
            if (isAdminOnly && !isAdmin) {
                return null;
            }
            let statusDisplay = 'AVAILABLE';
            let statusText = '余量充足';
            let statusColor = 'green';
            if (s.status === enums_1.SlotStatus.CLOSED || s.status === enums_1.SlotStatus.OUT_OF_HOURS || isPast) {
                statusDisplay = 'CLOSED';
                statusText = isPast ? '已过时段' : '不可预约';
                statusColor = 'gray';
            }
            else if (s.status === enums_1.SlotStatus.RESERVED) {
                statusDisplay = 'RESERVED';
                statusText = '内部预留';
                statusColor = 'purple';
            }
            else if (isAdminOnly) {
                statusDisplay = 'ADMIN_ONLY';
                statusText = '管理员专属';
                statusColor = 'purple';
            }
            else if (remaining === 0) {
                statusDisplay = 'FULL';
                statusText = '已满';
                statusColor = 'red';
            }
            else if (remaining <= 2) {
                statusDisplay = 'TIGHT';
                statusText = remaining === 1 ? '仅剩1个' : '余量紧张';
                statusColor = 'orange';
            }
            else {
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
    async generateSlotsForDate(venue, date) {
        const maxAttempts = 3;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                return await this.prisma.$transaction(async (tx) => {
                    const existing = await tx.venueSlot.findMany({
                        where: { venueId: venue.id, date },
                        orderBy: { startTime: 'asc' },
                    });
                    if (existing.length > 0)
                        return existing;
                    const startHour = parseInt(venue.openTime.split(':')[0], 10) || 8;
                    const endHour = parseInt(venue.closeTime.split(':')[0], 10) || 22;
                    const intervalMinutes = venue.bookingInterval || 60;
                    const slotsToCreate = [];
                    let current = dayjs(`${date} ${venue.openTime}`);
                    const end = dayjs(`${date} ${venue.closeTime}`);
                    while (current.isBefore(end)) {
                        const next = current.add(intervalMinutes, 'minute');
                        if (next.isAfter(end))
                            break;
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
                            status: enums_1.SlotStatus.AVAILABLE,
                            isAdminOnly: false,
                        });
                        current = next;
                    }
                    const adminOnlySlots = [];
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
                            status: enums_1.SlotStatus.ADMIN_ONLY,
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
                            status: enums_1.SlotStatus.ADMIN_ONLY,
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
            }
            catch (err) {
                if (err.code === 'P2002' && attempt < maxAttempts - 1) {
                    this.logger.warn(`Slot 生成并发冲突，第 ${attempt + 1} 次重试...`);
                    continue;
                }
                throw err;
            }
        }
        return this.prisma.venueSlot.findMany({
            where: { venueId: venue.id, date },
            orderBy: { startTime: 'asc' },
        });
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
};
exports.VenuesService = VenuesService;
exports.VenuesService = VenuesService = VenuesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], VenuesService);
//# sourceMappingURL=venues.service.js.map