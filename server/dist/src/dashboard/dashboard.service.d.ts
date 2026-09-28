import { PrismaService } from '../common/prisma/prisma.service';
export declare class DashboardService {
    private prisma;
    constructor(prisma: PrismaService);
    getOverview(): Promise<{
        kpi: {
            todayOrders: number;
            todayOrderGrowth: number;
            todayBookings: number;
            todayBookingGrowth: number;
            todayNetIncome: number;
            todayIncomeGrowth: number;
            yesterdayNetIncome: number;
            monthRevenue: number;
            totalRevenue: number;
            pendingSettlement: number;
            totalRefunds: number;
            realtimeUsage: {
                used: number;
                total: number;
                rate: number;
            };
        };
        incomeTrend: any[];
        bookingTrend: any[];
        venuePieData: {
            name: string;
            value: number;
            percentage: number;
        }[];
        venueRanking: {
            id: string;
            name: string;
            type: string;
            income: number;
            utilization: number;
        }[];
        hotTimeSlots: {
            timeRange: string;
            booked: number;
            total: number;
            rate: number;
        }[];
        suggestions: {
            id: string;
            title: string;
            content: string;
            tag: string;
            level: string;
        }[];
    }>;
    getRealtimeStatus(): Promise<{
        venueId: string;
        venueName: string;
        venueType: string;
        coverImage: string;
        currentSlotRange: string;
        currentCapacity: number;
        currentBooked: number;
        currentRemaining: number;
        currentRate: number;
        statusLevel: string;
        statusText: string;
        statusColor: string;
        nextSlotRange: string;
        nextRemaining: number;
    }[]>;
    getHeatmap(): Promise<{
        days: string[];
        hours: string[];
        matrix: number[][];
    }>;
}
