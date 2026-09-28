import { PrismaService } from '../common/prisma/prisma.service';
import { CreateVenueDto, UpdateVenueDto } from './dto/admin-venue.dto';
import { CreateUserDto } from './dto/create-user.dto';
export declare class AdminService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    getVenues(page?: number, pageSize?: number, keyword?: string): Promise<{
        list: {
            id: string;
            name: string;
            type: string;
            description: string;
            address: string;
            coverImage: string;
            basePrice: number;
            capacity: number;
            openTime: string;
            closeTime: string;
            status: string;
            facilities: string[];
            rules: string;
            todayBookingsCount: number;
            todayIncome: number;
            createdAt: Date;
        }[];
        total: number;
        page: number;
        pageSize: number;
    }>;
    createVenue(dto: CreateVenueDto, operatorId: string): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        type: string;
        description: string;
        address: string;
        coverImage: string;
        latitude: number | null;
        longitude: number | null;
        basePrice: number;
        capacity: number;
        openTime: string;
        closeTime: string;
        bookingInterval: number;
        advanceDays: number;
        facilities: string | null;
        rules: string | null;
    }>;
    updateVenue(id: string, dto: UpdateVenueDto, operatorId: string): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        type: string;
        description: string;
        address: string;
        coverImage: string;
        latitude: number | null;
        longitude: number | null;
        basePrice: number;
        capacity: number;
        openTime: string;
        closeTime: string;
        bookingInterval: number;
        advanceDays: number;
        facilities: string | null;
        rules: string | null;
    }>;
    previewTimeChange(id: string, openTime: string, closeTime: string): Promise<{
        venueId: string;
        originalOpenTime: string;
        originalCloseTime: string;
        newOpenTime: string;
        newCloseTime: string;
        toAdd: number;
        toRemove: number;
        keepWithBooking: number;
        message: string;
    }>;
    deleteVenue(id: string, operatorId: string): Promise<{
        message: string;
    }>;
    batchUpdateTime(openTime: string, closeTime: string, operatorId: string): Promise<{
        updatedCount: number;
        openTime: string;
        closeTime: string;
    }>;
    setClosedDate(venueId: string, startDate: string, endDate: string, reason: string, operatorId: string): Promise<{
        venueId: string;
        startDate: string;
        endDate: string;
        closedDays: number;
        reason: string;
    }>;
    reopenVenue(venueId: string, operatorId: string): Promise<{
        venueId: string;
        reopenedAt: Date;
    }>;
    getBookings(page?: number, pageSize?: number, venueId?: string, date?: string, status?: string, keyword?: string): Promise<{
        list: {
            id: string;
            bookingNo: string;
            bookingCode: string;
            userName: string;
            userPhone: string;
            venueName: string;
            bookingDate: string;
            timeRange: string;
            courtNo: number;
            quantity: number;
            unitPrice: number;
            totalAmount: number;
            status: string;
            source: string;
            paymentStatus: string;
            checkedInAt: Date;
            cancelledAt: Date;
            createdAt: Date;
        }[];
        total: number;
        page: number;
        pageSize: number;
    }>;
    getLogs(page?: number, pageSize?: number): Promise<{
        list: {
            id: string;
            operatorName: string;
            operatorRole: string;
            action: string;
            module: string;
            description: string;
            createdAt: Date;
        }[];
        total: number;
        page: number;
        pageSize: number;
    }>;
    private syncFutureSlotConfig;
    private rebuildFutureSlots;
    private cancelBookingInTx;
    private buildSlotRanges;
    private groupByDate;
    private calcSlotPrice;
    createUser(dto: CreateUserDto, operatorId: string, operatorRole: string): Promise<{
        id: string;
        username: string;
        nickname: string;
        role: string;
        createdAt: Date;
    }>;
    getUsers(role?: string, page?: number, pageSize?: number): Promise<{
        list: {
            id: string;
            status: string;
            createdAt: Date;
            username: string;
            nickname: string;
            phone: string;
            role: string;
        }[];
        total: number;
        page: number;
        pageSize: number;
    }>;
    deleteUser(id: string, operatorId: string, operatorRole: string): Promise<{
        id: string;
        username: string;
    }>;
}
