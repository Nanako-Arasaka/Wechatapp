import { PaymentsService } from './payments.service';
export declare class PaymentsController {
    private readonly paymentsService;
    constructor(paymentsService: PaymentsService);
    findMyPayments(userId: string): Promise<({
        order: {
            booking: {
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
            };
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
    } & {
        id: string;
        status: string;
        transactionNo: string;
        paymentNo: string;
        paidAt: Date;
        amount: number;
        orderId: string;
        paymentMethod: string;
    })[]>;
}
