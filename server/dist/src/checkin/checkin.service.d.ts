import { PrismaService } from '../common/prisma/prisma.service';
export declare class CheckinService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    verifyCode(codeStr: string): Promise<{
        bookingId: string;
        bookingNo: string;
        bookingCode: string;
        userName: string;
        userPhone: string;
        venueName: string;
        venueAddress: string;
        bookingDate: string;
        timeRange: string;
        quantity: number;
        courtNo: number;
        amount: number;
        status: string;
        statusText: string;
        canConfirm: boolean;
    }>;
    confirmCheckin(bookingId: string, operatorId: string): Promise<{
        checkinRecordId: string;
        bookingNo: string;
        bookingCode: string;
        venueName: string;
        checkinAt: Date;
        operatorName: string;
        message: string;
    }>;
}
