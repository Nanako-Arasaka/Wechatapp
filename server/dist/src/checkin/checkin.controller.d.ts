import { CheckinService } from './checkin.service';
export declare class CheckinController {
    private readonly checkinService;
    constructor(checkinService: CheckinService);
    verify(code: string): Promise<{
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
    confirm(bookingId: string, operatorId: string): Promise<{
        checkinRecordId: string;
        bookingNo: string;
        bookingCode: string;
        venueName: string;
        checkinAt: Date;
        operatorName: string;
        message: string;
    }>;
}
