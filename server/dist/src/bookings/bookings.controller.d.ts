import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
export declare class BookingsController {
    private readonly bookingsService;
    constructor(bookingsService: BookingsService);
    create(userId: string, role: string, dto: CreateBookingDto): Promise<{
        bookingId: string;
        bookingNo: string;
        bookingCode: string;
        orderId: string;
        orderNo: string;
        amount: number;
        expiredAt: Date;
        venueName: string;
        date: string;
        timeRange: string;
        quantity: number;
        source: string;
    }>;
    findOne(id: string, userId: string): Promise<{
        venue: {
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
        };
        checkinRecords: {
            id: string;
            status: string;
            bookingId: string;
            userId: string;
            operatorId: string;
            checkinCode: string;
            checkinAt: Date;
        }[];
        order: {
            payments: {
                id: string;
                status: string;
                transactionNo: string;
                paymentNo: string;
                paidAt: Date;
                amount: number;
                orderId: string;
                paymentMethod: string;
            }[];
            refunds: {
                id: string;
                status: string;
                createdAt: Date;
                refundNo: string;
                amount: number;
                completedAt: Date | null;
                reason: string | null;
                orderId: string;
            }[];
        } & {
            id: string;
            createdAt: Date;
            paidAt: Date | null;
            amount: number;
            bookingId: string;
            orderNo: string;
            cancelledAt: Date | null;
            userId: string;
            discountAmount: number;
            paidAmount: number;
            refundAmount: number;
            paymentStatus: string;
            orderStatus: string;
        };
        slot: {
            id: string;
            venueId: string;
            date: string;
            startTime: string;
            endTime: string;
            price: number;
            totalCapacity: number;
            bookedCapacity: number;
            status: string;
            isAdminOnly: boolean;
            createdAt: Date;
            updatedAt: Date;
        };
    } & {
        id: string;
        venueId: string;
        startTime: string;
        endTime: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        slotId: string;
        courtNo: number | null;
        quantity: number;
        contactName: string | null;
        studentNo: string | null;
        contactPhone: string | null;
        bookingNo: string;
        bookingCode: string;
        expiredAt: Date | null;
        source: string;
        bookingDate: string;
        unitPrice: number;
        totalAmount: number;
        checkedInAt: Date | null;
        cancelledAt: Date | null;
        userId: string;
    }>;
    cancel(id: string, userId: string, role: string): Promise<{
        bookingId: string;
        bookingNo: string;
        status: string;
        refundAmount: number;
        refundNo: any;
        message: string;
    }>;
}
