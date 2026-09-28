import { PrismaService } from '../common/prisma/prisma.service';
import { QueryVenueDto } from './dto/query-venue.dto';
export declare class VenuesService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    findAll(query: QueryVenueDto): Promise<{
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
            availableSlotsCount: number;
            totalRemaining: number;
            utilizationRate: number;
            recommendScore: number;
        }[];
        total: number;
        page: number;
        pageSize: number;
    }>;
    findOne(id: string): Promise<{
        facilities: string[];
        reviews: any[];
        rating: number;
        totalBookings: number;
        closedDates: {
            id: string;
            venueId: string;
            date: string;
            createdAt: Date;
            reason: string;
        }[];
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
        rules: string | null;
    }>;
    getSlotCourts(venueId: string, slotId: string): Promise<{
        slotId: string;
        date: string;
        timeRange: string;
        totalCapacity: number;
        bookedCapacity: number;
        occupied: number[];
    }>;
    getAvailability(venueId: string, dateStr?: string, isAdmin?: boolean): Promise<{
        venueId: string;
        venueName: string;
        date: string;
        isClosed: boolean;
        closedReason: string;
        slots: any[];
        peakAdvice: string;
        basePrice?: undefined;
    } | {
        venueId: string;
        venueName: string;
        basePrice: number;
        date: string;
        isClosed: boolean;
        slots: {
            id: string;
            venueId: string;
            date: string;
            startTime: string;
            endTime: string;
            timeRange: string;
            price: number;
            totalCapacity: number;
            bookedCapacity: number;
            remaining: number;
            status: string;
            statusText: string;
            statusColor: string;
            isSelectable: boolean;
            isAdminOnly: boolean;
        }[];
        peakAdvice: string;
        closedReason?: undefined;
    }>;
    private generateSlotsForDate;
    private calcSlotPrice;
}
