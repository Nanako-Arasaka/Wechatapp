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
exports.UpdateVenueDto = exports.CreateVenueDto = void 0;
const class_validator_1 = require("class-validator");
const enums_1 = require("../../common/enums");
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
let IsTimeStringConstraint = class IsTimeStringConstraint {
    validate(value) {
        return typeof value === 'string' && TIME_REGEX.test(value);
    }
    defaultMessage(args) {
        return `${args.property} 必须是 HH:mm 格式`;
    }
};
IsTimeStringConstraint = __decorate([
    (0, class_validator_1.ValidatorConstraint)({ name: 'isTimeString', async: false })
], IsTimeStringConstraint);
let TimeRangeValidConstraint = class TimeRangeValidConstraint {
    validate(_value, args) {
        const obj = args.object;
        const open = obj.openTime;
        const close = obj.closeTime;
        if (!open || !close)
            return true;
        if (!TIME_REGEX.test(open) || !TIME_REGEX.test(close))
            return true;
        const [openH, openM] = open.split(':').map(Number);
        const [closeH, closeM] = close.split(':').map(Number);
        const openMinutes = openH * 60 + openM;
        const closeMinutes = closeH * 60 + closeM;
        return closeMinutes - openMinutes >= 60;
    }
    defaultMessage() {
        return '结束时间必须晚于开始时间，且间隔至少 1 小时';
    }
};
TimeRangeValidConstraint = __decorate([
    (0, class_validator_1.ValidatorConstraint)({ name: 'timeRangeValid', async: false })
], TimeRangeValidConstraint);
class CreateVenueDto {
}
exports.CreateVenueDto = CreateVenueDto;
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: '场馆名称不能为空' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreateVenueDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: '场馆类型不能为空' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateVenueDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: '场馆介绍不能为空' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], CreateVenueDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: '场馆地址不能为空' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], CreateVenueDto.prototype, "address", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: '封面图不能为空' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateVenueDto.prototype, "coverImage", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: '单价不能为空' }),
    (0, class_validator_1.IsInt)({ message: '单价必须为分' }),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateVenueDto.prototype, "basePrice", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: '单时段容量不能为空' }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateVenueDto.prototype, "capacity", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: '开放时间不能为空' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Validate)(IsTimeStringConstraint),
    __metadata("design:type", String)
], CreateVenueDto.prototype, "openTime", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: '关闭时间不能为空' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Validate)(IsTimeStringConstraint),
    __metadata("design:type", String)
], CreateVenueDto.prototype, "closeTime", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], CreateVenueDto.prototype, "facilities", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], CreateVenueDto.prototype, "rules", void 0);
__decorate([
    (0, class_validator_1.Validate)(TimeRangeValidConstraint),
    __metadata("design:type", Object)
], CreateVenueDto.prototype, "timeRangeValid", void 0);
class UpdateVenueDto {
}
exports.UpdateVenueDto = UpdateVenueDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], UpdateVenueDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateVenueDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], UpdateVenueDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], UpdateVenueDto.prototype, "address", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateVenueDto.prototype, "coverImage", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateVenueDto.prototype, "basePrice", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], UpdateVenueDto.prototype, "capacity", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Validate)(IsTimeStringConstraint),
    __metadata("design:type", String)
], UpdateVenueDto.prototype, "openTime", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Validate)(IsTimeStringConstraint),
    __metadata("design:type", String)
], UpdateVenueDto.prototype, "closeTime", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(enums_1.VenueStatus),
    __metadata("design:type", String)
], UpdateVenueDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], UpdateVenueDto.prototype, "facilities", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], UpdateVenueDto.prototype, "rules", void 0);
__decorate([
    (0, class_validator_1.Validate)(TimeRangeValidConstraint),
    __metadata("design:type", Object)
], UpdateVenueDto.prototype, "timeRangeValid", void 0);
//# sourceMappingURL=admin-venue.dto.js.map