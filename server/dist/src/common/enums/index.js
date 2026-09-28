"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderStatus = exports.PaymentStatus = exports.BookingStatus = exports.BookingSource = exports.SlotStatus = exports.VenueStatus = exports.VenueType = exports.UserStatus = exports.Role = void 0;
var Role;
(function (Role) {
    Role["USER"] = "USER";
    Role["ADMIN"] = "ADMIN";
    Role["SUPER_ADMIN"] = "SUPER_ADMIN";
})(Role || (exports.Role = Role = {}));
var UserStatus;
(function (UserStatus) {
    UserStatus["ACTIVE"] = "ACTIVE";
    UserStatus["DISABLED"] = "DISABLED";
})(UserStatus || (exports.UserStatus = UserStatus = {}));
var VenueType;
(function (VenueType) {
    VenueType["BADMINTON"] = "BADMINTON";
    VenueType["BASKETBALL"] = "BASKETBALL";
    VenueType["TENNIS"] = "TENNIS";
    VenueType["TABLE_TENNIS"] = "TABLE_TENNIS";
    VenueType["FOOTBALL"] = "FOOTBALL";
    VenueType["SWIMMING"] = "SWIMMING";
    VenueType["FITNESS"] = "FITNESS";
    VenueType["MULTI"] = "MULTI";
})(VenueType || (exports.VenueType = VenueType = {}));
var VenueStatus;
(function (VenueStatus) {
    VenueStatus["ACTIVE"] = "ACTIVE";
    VenueStatus["INACTIVE"] = "INACTIVE";
    VenueStatus["MAINTENANCE"] = "MAINTENANCE";
    VenueStatus["DELETED"] = "DELETED";
})(VenueStatus || (exports.VenueStatus = VenueStatus = {}));
var SlotStatus;
(function (SlotStatus) {
    SlotStatus["AVAILABLE"] = "AVAILABLE";
    SlotStatus["FULL"] = "FULL";
    SlotStatus["CLOSED"] = "CLOSED";
    SlotStatus["ADMIN_ONLY"] = "ADMIN_ONLY";
    SlotStatus["RESERVED"] = "RESERVED";
    SlotStatus["OUT_OF_HOURS"] = "OUT_OF_HOURS";
})(SlotStatus || (exports.SlotStatus = SlotStatus = {}));
var BookingSource;
(function (BookingSource) {
    BookingSource["USER"] = "USER";
    BookingSource["ADMIN"] = "ADMIN";
})(BookingSource || (exports.BookingSource = BookingSource = {}));
var BookingStatus;
(function (BookingStatus) {
    BookingStatus["PENDING_PAYMENT"] = "PENDING_PAYMENT";
    BookingStatus["CONFIRMED"] = "CONFIRMED";
    BookingStatus["CHECKED_IN"] = "CHECKED_IN";
    BookingStatus["COMPLETED"] = "COMPLETED";
    BookingStatus["CANCELLED"] = "CANCELLED";
    BookingStatus["REFUNDING"] = "REFUNDING";
    BookingStatus["REFUNDED"] = "REFUNDED";
    BookingStatus["EXPIRED"] = "EXPIRED";
})(BookingStatus || (exports.BookingStatus = BookingStatus = {}));
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["UNPAID"] = "UNPAID";
    PaymentStatus["PAID"] = "PAID";
    PaymentStatus["REFUNDED"] = "REFUNDED";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
var OrderStatus;
(function (OrderStatus) {
    OrderStatus["PENDING_PAYMENT"] = "PENDING_PAYMENT";
    OrderStatus["PAID"] = "PAID";
    OrderStatus["COMPLETED"] = "COMPLETED";
    OrderStatus["CANCELLED"] = "CANCELLED";
    OrderStatus["REFUNDED"] = "REFUNDED";
    OrderStatus["EXPIRED"] = "EXPIRED";
})(OrderStatus || (exports.OrderStatus = OrderStatus = {}));
//# sourceMappingURL=index.js.map