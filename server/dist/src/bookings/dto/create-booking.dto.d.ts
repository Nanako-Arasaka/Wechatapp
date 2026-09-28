export declare enum BookingPrivilege {
    NONE = "NONE",
    RESERVE = "RESERVE",
    EXPAND = "EXPAND"
}
export declare class CreateBookingDto {
    venueId: string;
    slotId: string;
    quantity: number;
    contactName: string;
    studentNo: string;
    contactPhone: string;
    privilege?: BookingPrivilege;
    courtNo?: number;
}
