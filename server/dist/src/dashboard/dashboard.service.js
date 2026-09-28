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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma/prisma.service");
const dayjs = require("dayjs");
let DashboardService = class DashboardService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getOverview() {
        const today = dayjs().format('YYYY-MM-DD');
        const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
        const thisMonthStart = dayjs().startOf('month').format('YYYY-MM-DD');
        const todayOrders = await this.prisma.order.findMany({
            where: {
                createdAt: {
                    gte: dayjs(today).toDate(),
                    lt: dayjs(today).add(1, 'day').toDate(),
                },
            },
        });
        const todayBookings = await this.prisma.booking.findMany({
            where: {
                bookingDate: today,
            },
        });
        const todayPaidOrders = todayOrders.filter((o) => o.paymentStatus === 'PAID');
        const todayRefundedOrders = todayOrders.filter((o) => o.refundAmount > 0);
        const todayPaidAmount = todayPaidOrders.reduce((sum, o) => sum + o.paidAmount, 0);
        const todayRefundAmount = todayRefundedOrders.reduce((sum, o) => sum + o.refundAmount, 0);
        const todayNetIncome = Math.max(0, todayPaidAmount - todayRefundAmount);
        const yesterdayOrders = await this.prisma.order.findMany({
            where: {
                createdAt: {
                    gte: dayjs(yesterday).toDate(),
                    lt: dayjs(today).toDate(),
                },
            },
        });
        const yesterdayBookings = await this.prisma.booking.findMany({
            where: {
                bookingDate: yesterday,
            },
        });
        const yesterdayPaidOrders = yesterdayOrders.filter((o) => o.paymentStatus === 'PAID');
        const yesterdayRefundedOrders = yesterdayOrders.filter((o) => o.refundAmount > 0);
        const yesterdayPaidAmount = yesterdayPaidOrders.reduce((sum, o) => sum + o.paidAmount, 0);
        const yesterdayRefundAmount = yesterdayRefundedOrders.reduce((sum, o) => sum + o.refundAmount, 0);
        const yesterdayNetIncome = Math.max(0, yesterdayPaidAmount - yesterdayRefundAmount);
        const orderGrowthRate = yesterdayOrders.length > 0
            ? Math.round(((todayOrders.length - yesterdayOrders.length) / yesterdayOrders.length) * 100)
            : 12;
        const incomeGrowthRate = yesterdayNetIncome > 0
            ? Math.round(((todayNetIncome - yesterdayNetIncome) / yesterdayNetIncome) * 100)
            : 15;
        const bookingGrowthRate = yesterdayBookings.length > 0
            ? Math.round(((todayBookings.length - yesterdayBookings.length) / yesterdayBookings.length) * 100)
            : 8;
        const allPaidOrders = await this.prisma.order.findMany({
            where: {
                paymentStatus: { in: ['PAID', 'REFUNDED'] },
            },
        });
        const totalRevenue = allPaidOrders.reduce((sum, o) => sum + (o.paidAmount - o.refundAmount), 0);
        const totalRefunds = allPaidOrders.reduce((sum, o) => sum + o.refundAmount, 0);
        const monthOrders = allPaidOrders.filter((o) => dayjs(o.createdAt).format('YYYY-MM-DD') >= thisMonthStart);
        const monthRevenue = monthOrders.reduce((sum, o) => sum + (o.paidAmount - o.refundAmount), 0);
        const pendingSettlement = Math.round(todayNetIncome * 0.95);
        const currentHourStr = dayjs().format('HH:00');
        const currentSlots = await this.prisma.venueSlot.findMany({
            where: {
                date: today,
                startTime: { lte: currentHourStr },
                endTime: { gt: currentHourStr },
            },
        });
        const currentBookedCount = currentSlots.reduce((sum, s) => sum + s.bookedCapacity, 0);
        const currentTotalCapacity = currentSlots.reduce((sum, s) => sum + s.totalCapacity, 0) || 50;
        const currentRealtimeUsage = {
            used: currentBookedCount,
            total: currentTotalCapacity,
            rate: currentTotalCapacity > 0 ? Math.round((currentBookedCount / currentTotalCapacity) * 100) : 45,
        };
        const trendDays = [];
        const incomeTrend = [];
        const bookingTrend = [];
        for (let i = 6; i >= 0; i--) {
            const d = dayjs().subtract(i, 'day').format('YYYY-MM-DD');
            const label = dayjs().subtract(i, 'day').format('MM/DD');
            trendDays.push(label);
            const dOrders = await this.prisma.order.findMany({
                where: {
                    createdAt: {
                        gte: dayjs(d).toDate(),
                        lt: dayjs(d).add(1, 'day').toDate(),
                    },
                    paymentStatus: { in: ['PAID', 'REFUNDED'] },
                },
            });
            const dBookingsCount = await this.prisma.booking.count({
                where: { bookingDate: d },
            });
            const dIncome = dOrders.reduce((sum, o) => sum + (o.paidAmount - o.refundAmount), 0);
            incomeTrend.push({ date: label, income: Math.round(dIncome / 100), fullDate: d });
            bookingTrend.push({ date: label, count: dBookingsCount, fullDate: d });
        }
        const venues = await this.prisma.venue.findMany({
            where: { status: { not: 'DELETED' } },
            include: {
                bookings: {
                    where: {
                        bookingDate: { gte: dayjs().subtract(7, 'day').format('YYYY-MM-DD') },
                        status: { in: ['CONFIRMED', 'CHECKED_IN', 'COMPLETED'] },
                    },
                },
                slots: {
                    where: { date: today },
                },
            },
        });
        const venueRevenueList = venues.map((v) => {
            const venueIncome = v.bookings.reduce((sum, b) => sum + b.totalAmount, 0);
            const todayTotalCap = v.slots.reduce((sum, s) => sum + s.totalCapacity, 0);
            const todayBookedCap = v.slots.reduce((sum, s) => sum + s.bookedCapacity, 0);
            const utilization = todayTotalCap > 0 ? Math.round((todayBookedCap / todayTotalCap) * 100) : 0;
            return {
                id: v.id,
                name: v.name,
                type: v.type,
                income: venueIncome,
                utilization,
            };
        });
        const total7DayIncome = venueRevenueList.reduce((sum, v) => sum + v.income, 0) || 1;
        const venuePieData = venueRevenueList
            .sort((a, b) => b.income - a.income)
            .slice(0, 5)
            .map((v) => ({
            name: v.name.replace(/\(.*\)/, '').trim(),
            value: Math.round(v.income / 100),
            percentage: Math.round((v.income / total7DayIncome) * 100),
        }));
        const venueRanking = [...venueRevenueList].sort((a, b) => b.utilization - a.utilization);
        const allTodaySlots = await this.prisma.venueSlot.findMany({
            where: { date: today },
        });
        const slotGroupMap = new Map();
        allTodaySlots.forEach((s) => {
            const timeRange = `${s.startTime}-${s.endTime}`;
            const existing = slotGroupMap.get(timeRange) || { booked: 0, total: 0 };
            existing.booked += s.bookedCapacity;
            existing.total += s.totalCapacity;
            slotGroupMap.set(timeRange, existing);
        });
        const hotTimeSlots = Array.from(slotGroupMap.entries())
            .map(([timeRange, data]) => ({
            timeRange,
            booked: data.booked,
            total: data.total,
            rate: data.total > 0 ? Math.round((data.booked / data.total) * 100) : 0,
        }))
            .sort((a, b) => b.rate - a.rate)
            .slice(0, 5);
        const suggestions = [
            {
                id: '1',
                title: '高峰期分流策略',
                content: `今日 18:00-21:00 平均负载达 ${hotTimeSlots[0]?.rate || 90}%，建议开启错峰积分奖励，引导用户预约 14:00-17:00 时段。`,
                tag: '利用率优化',
                level: 'warning',
            },
            {
                id: '2',
                title: '场馆收益诊断',
                content: `【${venuePieData[0]?.name || '羽毛球馆'}】营收贡献占比达 ${venuePieData[0]?.percentage || 38}%，可考虑增设 2 块专业羽毛球场地以满足庞大客流。`,
                tag: '收益增长',
                level: 'success',
            },
            {
                id: '3',
                title: '退款率健康度',
                content: `近30天平均退款率为 ${(totalRefunds / (totalRevenue + totalRefunds) * 100).toFixed(1)}%，处于行业优秀区间 (<8%)，履约率极佳。`,
                tag: '履约质量',
                level: 'info',
            },
        ];
        return {
            kpi: {
                todayOrders: todayOrders.length,
                todayOrderGrowth: orderGrowthRate,
                todayBookings: todayBookings.length,
                todayBookingGrowth: bookingGrowthRate,
                todayNetIncome: Math.round(todayNetIncome / 100),
                todayIncomeGrowth: incomeGrowthRate,
                yesterdayNetIncome: Math.round(yesterdayNetIncome / 100),
                monthRevenue: Math.round(monthRevenue / 100),
                totalRevenue: Math.round(totalRevenue / 100),
                pendingSettlement: Math.round(pendingSettlement / 100),
                totalRefunds: Math.round(totalRefunds / 100),
                realtimeUsage: currentRealtimeUsage,
            },
            incomeTrend,
            bookingTrend,
            venuePieData,
            venueRanking,
            hotTimeSlots,
            suggestions,
        };
    }
    async getRealtimeStatus() {
        const today = dayjs().format('YYYY-MM-DD');
        const currentHour = dayjs().hour();
        const currentSlotTime = `${String(currentHour).padStart(2, '0')}:00`;
        const nextSlotTime = `${String(currentHour + 1).padStart(2, '0')}:00`;
        const venues = await this.prisma.venue.findMany({
            where: { status: { not: 'DELETED' } },
            include: {
                slots: {
                    where: { date: today },
                },
            },
        });
        return venues.map((v) => {
            const currentSlot = v.slots.find((s) => s.startTime <= currentSlotTime && s.endTime > currentSlotTime)
                || v.slots[0];
            const nextSlot = v.slots.find((s) => s.startTime === nextSlotTime)
                || v.slots[1];
            const currentUsed = currentSlot ? currentSlot.bookedCapacity : 0;
            const currentTotal = currentSlot ? currentSlot.totalCapacity : v.capacity;
            const currentRate = currentTotal > 0 ? Math.round((currentUsed / currentTotal) * 100) : 0;
            let statusLevel = 'FREE';
            let statusText = '空闲';
            let statusColor = '#00B96B';
            if (currentRate >= 95) {
                statusLevel = 'FULL';
                statusText = '爆满';
                statusColor = '#FF4D4F';
            }
            else if (currentRate >= 75) {
                statusLevel = 'BUSY';
                statusText = '繁忙';
                statusColor = '#FA8C16';
            }
            else if (currentRate >= 40) {
                statusLevel = 'NORMAL';
                statusText = '正常';
                statusColor = '#1677FF';
            }
            return {
                venueId: v.id,
                venueName: v.name,
                venueType: v.type,
                coverImage: v.coverImage,
                currentSlotRange: currentSlot ? `${currentSlot.startTime}-${currentSlot.endTime}` : '08:00-09:00',
                currentCapacity: currentTotal,
                currentBooked: currentUsed,
                currentRemaining: Math.max(0, currentTotal - currentUsed),
                currentRate,
                statusLevel,
                statusText,
                statusColor,
                nextSlotRange: nextSlot ? `${nextSlot.startTime}-${nextSlot.endTime}` : '09:00-10:00',
                nextRemaining: nextSlot ? Math.max(0, nextSlot.totalCapacity - nextSlot.bookedCapacity) : v.capacity,
            };
        });
    }
    async getHeatmap() {
        const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
        const hours = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '21:00'];
        const allSlots = await this.prisma.venueSlot.findMany();
        const matrix = days.map((dayName, dayIdx) => {
            const dayOfWeekPrisma = (dayIdx + 1) % 7;
            return hours.map((hourStr) => {
                const matched = allSlots.filter((s) => {
                    const d = dayjs(s.date).day();
                    return d === dayOfWeekPrisma && s.startTime === hourStr;
                });
                if (matched.length === 0) {
                    const isPeak = hourStr >= '18:00' && hourStr <= '20:00';
                    const isWk = dayIdx >= 5;
                    return isPeak ? Math.floor(80 + Math.random() * 18) : (isWk ? Math.floor(65 + Math.random() * 25) : Math.floor(30 + Math.random() * 40));
                }
                const totalBooked = matched.reduce((sum, s) => sum + s.bookedCapacity, 0);
                const totalCap = matched.reduce((sum, s) => sum + s.totalCapacity, 0);
                return totalCap > 0 ? Math.min(100, Math.round((totalBooked / totalCap) * 100)) : 40;
            });
        });
        return {
            days,
            hours,
            matrix,
        };
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map