"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessException = exports.BusinessErrorCode = void 0;
const common_1 = require("@nestjs/common");
var BusinessErrorCode;
(function (BusinessErrorCode) {
    BusinessErrorCode[BusinessErrorCode["SUCCESS"] = 0] = "SUCCESS";
    BusinessErrorCode[BusinessErrorCode["COMMON_ERROR"] = 40000] = "COMMON_ERROR";
    BusinessErrorCode[BusinessErrorCode["PARAM_INVALID"] = 40001] = "PARAM_INVALID";
    BusinessErrorCode[BusinessErrorCode["UNAUTHORIZED"] = 40101] = "UNAUTHORIZED";
    BusinessErrorCode[BusinessErrorCode["FORBIDDEN"] = 40301] = "FORBIDDEN";
    BusinessErrorCode[BusinessErrorCode["NOT_FOUND"] = 40401] = "NOT_FOUND";
    BusinessErrorCode[BusinessErrorCode["VENUE_NOT_FOUND"] = 40410] = "VENUE_NOT_FOUND";
    BusinessErrorCode[BusinessErrorCode["VENUE_CLOSED"] = 40011] = "VENUE_CLOSED";
    BusinessErrorCode[BusinessErrorCode["VENUE_INACTIVE"] = 40012] = "VENUE_INACTIVE";
    BusinessErrorCode[BusinessErrorCode["SLOT_NOT_FOUND"] = 40420] = "SLOT_NOT_FOUND";
    BusinessErrorCode[BusinessErrorCode["SLOT_CAPACITY_NOT_ENOUGH"] = 40021] = "SLOT_CAPACITY_NOT_ENOUGH";
    BusinessErrorCode[BusinessErrorCode["SLOT_ALREADY_FULL"] = 40022] = "SLOT_ALREADY_FULL";
    BusinessErrorCode[BusinessErrorCode["SLOT_CLOSED"] = 40023] = "SLOT_CLOSED";
    BusinessErrorCode[BusinessErrorCode["BOOKING_NOT_FOUND"] = 40430] = "BOOKING_NOT_FOUND";
    BusinessErrorCode[BusinessErrorCode["BOOKING_STATUS_INVALID"] = 40031] = "BOOKING_STATUS_INVALID";
    BusinessErrorCode[BusinessErrorCode["BOOKING_CANNOT_CANCEL"] = 40032] = "BOOKING_CANNOT_CANCEL";
    BusinessErrorCode[BusinessErrorCode["BOOKING_EXPIRED"] = 40033] = "BOOKING_EXPIRED";
    BusinessErrorCode[BusinessErrorCode["BOOKING_TIME_INVALID"] = 40034] = "BOOKING_TIME_INVALID";
    BusinessErrorCode[BusinessErrorCode["ORDER_NOT_FOUND"] = 40440] = "ORDER_NOT_FOUND";
    BusinessErrorCode[BusinessErrorCode["ORDER_ALREADY_PAID"] = 40041] = "ORDER_ALREADY_PAID";
    BusinessErrorCode[BusinessErrorCode["ORDER_PAY_FAILED"] = 40042] = "ORDER_PAY_FAILED";
    BusinessErrorCode[BusinessErrorCode["ORDER_CANNOT_REFUND"] = 40043] = "ORDER_CANNOT_REFUND";
    BusinessErrorCode[BusinessErrorCode["QRCODE_INVALID"] = 40050] = "QRCODE_INVALID";
    BusinessErrorCode[BusinessErrorCode["CHECKIN_ALREADY_DONE"] = 40051] = "CHECKIN_ALREADY_DONE";
    BusinessErrorCode[BusinessErrorCode["CHECKIN_NOT_START"] = 40052] = "CHECKIN_NOT_START";
    BusinessErrorCode[BusinessErrorCode["CHECKIN_EXPIRED"] = 40053] = "CHECKIN_EXPIRED";
    BusinessErrorCode[BusinessErrorCode["USER_ALREADY_EXISTS"] = 40060] = "USER_ALREADY_EXISTS";
})(BusinessErrorCode || (exports.BusinessErrorCode = BusinessErrorCode = {}));
class BusinessException extends common_1.HttpException {
    constructor(message, code = BusinessErrorCode.COMMON_ERROR, status = common_1.HttpStatus.BAD_REQUEST) {
        super({
            code,
            message,
            data: null,
        }, status);
        this.customCode = code;
    }
    getErrorCode() {
        return this.customCode;
    }
}
exports.BusinessException = BusinessException;
//# sourceMappingURL=business.exception.js.map