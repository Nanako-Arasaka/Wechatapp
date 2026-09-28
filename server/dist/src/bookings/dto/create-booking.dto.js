"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateBookingDto = exports.BookingPrivilege = void 0;
const class_validator_1 = require("class-validator");
var BookingPrivilege;
(function (BookingPrivilege) {
    BookingPrivilege["NONE"] = "NONE";
    BookingPrivilege["RESERVE"] = "RESERVE";
    BookingPrivilege["EXPAND"] = "EXPAND";
})(BookingPrivilege || (exports.BookingPrivilege = BookingPrivilege = {}));
class CreateBookingDto {
}
exports.CreateBookingDto = CreateBookingDto;
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: '场馆ID不能为空' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBookingDto.prototype, "venueId", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: '时段ID不能为空' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBookingDto.prototype, "slotId", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: '预约数量不能为空' }),
    (0, class_validator_1.IsInt)({ message: '预约数量必须为整数' }),
    (0, class_validator_1.Min)(1, { message: '预约数量至少为1' }),
    (0, class_validator_1.Max)(5, { message: '单次预约数量不可超过5' }),
    __metadata("design:type", Number)
], CreateBookingDto.prototype, "quantity", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: '姓名不能为空' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(20, { message: '姓名不能超过 20 个字符' }),
    __metadata("design:type", String)
], CreateBookingDto.prototype, "contactName", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: '学号不能为空' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\d{6,12}$/, { message: '学号须为 6-12 位数字' }),
    __metadata("design:type", String)
], CreateBookingDto.prototype, "studentNo", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: '手机号不能为空' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^1[3-9]\d{9}$/, { message: '请输入正确的 11 位手机号' }),
    __metadata("design:type", String)
], CreateBookingDto.prototype, "contactPhone", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(BookingPrivilege),
    __metadata("design:type", String)
], CreateBookingDto.prototype, "privilege", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)({ message: '场地编号必须为整数' }),
    (0, class_validator_1.Min)(1, { message: '场地编号至少为 1' }),
    __metadata("design:type", Number)
], CreateBookingDto.prototype, "courtNo", void 0);
//# sourceMappingURL=create-booking.dto.js.map