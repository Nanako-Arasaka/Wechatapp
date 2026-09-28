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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VenuesController = void 0;
const common_1 = require("@nestjs/common");
const venues_service_1 = require("./venues.service");
const query_venue_dto_1 = require("./dto/query-venue.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
let VenuesController = class VenuesController {
    constructor(venuesService) {
        this.venuesService = venuesService;
    }
    async findAll(query) {
        return this.venuesService.findAll(query);
    }
    async findOne(id) {
        return this.venuesService.findOne(id);
    }
    async getAvailability(id, date, user) {
        const isAdmin = user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN');
        return this.venuesService.getAvailability(id, date, isAdmin);
    }
    async getSlotCourts(id, slotId) {
        return this.venuesService.getSlotCourts(id, slotId);
    }
};
exports.VenuesController = VenuesController;
__decorate([
    (0, jwt_auth_guard_1.Public)(),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [query_venue_dto_1.QueryVenueDto]),
    __metadata("design:returntype", Promise)
], VenuesController.prototype, "findAll", null);
__decorate([
    (0, jwt_auth_guard_1.Public)(),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], VenuesController.prototype, "findOne", null);
__decorate([
    (0, jwt_auth_guard_1.Public)(),
    (0, common_1.Get)(':id/availability'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('date')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], VenuesController.prototype, "getAvailability", null);
__decorate([
    (0, jwt_auth_guard_1.Public)(),
    (0, common_1.Get)(':id/slots/:slotId/courts'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('slotId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], VenuesController.prototype, "getSlotCourts", null);
exports.VenuesController = VenuesController = __decorate([
    (0, common_1.Controller)('venues'),
    __metadata("design:paramtypes", [venues_service_1.VenuesService])
], VenuesController);
//# sourceMappingURL=venues.controller.js.map