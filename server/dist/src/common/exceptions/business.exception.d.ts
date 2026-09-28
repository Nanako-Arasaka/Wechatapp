import { HttpException, HttpStatus } from '@nestjs/common';
export declare enum BusinessErrorCode {
    SUCCESS = 0,
    COMMON_ERROR = 40000,
    PARAM_INVALID = 40001,
    UNAUTHORIZED = 40101,
    FORBIDDEN = 40301,
    NOT_FOUND = 40401,
    VENUE_NOT_FOUND = 40410,
    VENUE_CLOSED = 40011,
    VENUE_INACTIVE = 40012,
    SLOT_NOT_FOUND = 40420,
    SLOT_CAPACITY_NOT_ENOUGH = 40021,
    SLOT_ALREADY_FULL = 40022,
    SLOT_CLOSED = 40023,
    BOOKING_NOT_FOUND = 40430,
    BOOKING_STATUS_INVALID = 40031,
    BOOKING_CANNOT_CANCEL = 40032,
    BOOKING_EXPIRED = 40033,
    BOOKING_TIME_INVALID = 40034,
    ORDER_NOT_FOUND = 40440,
    ORDER_ALREADY_PAID = 40041,
    ORDER_PAY_FAILED = 40042,
    ORDER_CANNOT_REFUND = 40043,
    QRCODE_INVALID = 40050,
    CHECKIN_ALREADY_DONE = 40051,
    CHECKIN_NOT_START = 40052,
    CHECKIN_EXPIRED = 40053,
    USER_ALREADY_EXISTS = 40060
}
export declare class BusinessException extends HttpException {
    private customCode;
    constructor(message: string, code?: BusinessErrorCode, status?: HttpStatus);
    getErrorCode(): number;
}
