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
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const admin_service_1 = require("./admin.service");
const admin_venue_dto_1 = require("./dto/admin-venue.dto");
const create_user_dto_1 = require("./dto/create-user.dto");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const roles_guard_1 = require("../common/guards/roles.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
let AdminController = class AdminController {
    constructor(adminService) {
        this.adminService = adminService;
    }
    async getVenues(page, pageSize, keyword) {
        return this.adminService.getVenues(page ? parseInt(page, 10) : 1, pageSize ? parseInt(pageSize, 10) : 20, keyword);
    }
    async createVenue(dto, operatorId) {
        return this.adminService.createVenue(dto, operatorId);
    }
    async updateVenue(id, dto, operatorId) {
        return this.adminService.updateVenue(id, dto, operatorId);
    }
    async previewTimeChange(id, openTime, closeTime) {
        return this.adminService.previewTimeChange(id, openTime, closeTime);
    }
    async batchUpdateTime(openTime, closeTime, operatorId) {
        return this.adminService.batchUpdateTime(openTime, closeTime, operatorId);
    }
    async deleteVenue(id, operatorId) {
        return this.adminService.deleteVenue(id, operatorId);
    }
    async setClosedDate(venueId, startDate, endDate, reason, operatorId) {
        return this.adminService.setClosedDate(venueId, startDate, endDate, reason, operatorId);
    }
    async reopenVenue(venueId, operatorId) {
        return this.adminService.reopenVenue(venueId, operatorId);
    }
    async createUser(dto, operatorId, operatorRole) {
        return this.adminService.createUser(dto, operatorId, operatorRole);
    }
    async getUsers(role, page, pageSize) {
        return this.adminService.getUsers(role, page ? parseInt(page, 10) : 1, pageSize ? parseInt(pageSize, 10) : 50);
    }
    async deleteUser(id, operatorId, operatorRole) {
        return this.adminService.deleteUser(id, operatorId, operatorRole);
    }
    async getBookings(page, pageSize, venueId, date, status, keyword) {
        return this.adminService.getBookings(page ? parseInt(page, 10) : 1, pageSize ? parseInt(pageSize, 10) : 20, venueId, date, status, keyword);
    }
    async getLogs(page, pageSize) {
        return this.adminService.getLogs(page ? parseInt(page, 10) : 1, pageSize ? parseInt(pageSize, 10) : 20);
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('venues'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('pageSize')),
    __param(2, (0, common_1.Query)('keyword')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getVenues", null);
__decorate([
    (0, common_1.Post)('venues'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [admin_venue_dto_1.CreateVenueDto, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "createVenue", null);
__decorate([
    (0, common_1.Put)('venues/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, admin_venue_dto_1.UpdateVenueDto, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateVenue", null);
__decorate([
    (0, common_1.Post)('venues/:id/preview-time-change'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('openTime')),
    __param(2, (0, common_1.Body)('closeTime')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "previewTimeChange", null);
__decorate([
    (0, common_1.Post)('venues/batch-time'),
    __param(0, (0, common_1.Body)('openTime')),
    __param(1, (0, common_1.Body)('closeTime')),
    __param(2, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "batchUpdateTime", null);
__decorate([
    (0, common_1.Delete)('venues/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "deleteVenue", null);
__decorate([
    (0, common_1.Post)('venues/:id/close-date'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('startDate')),
    __param(2, (0, common_1.Body)('endDate')),
    __param(3, (0, common_1.Body)('reason')),
    __param(4, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "setClosedDate", null);
__decorate([
    (0, common_1.Post)('venues/:id/reopen'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "reopenVenue", null);
__decorate([
    (0, common_1.Post)('users'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(2, (0, current_user_decorator_1.CurrentUser)('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_user_dto_1.CreateUserDto, String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "createUser", null);
__decorate([
    (0, common_1.Get)('users'),
    __param(0, (0, common_1.Query)('role')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('pageSize')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getUsers", null);
__decorate([
    (0, common_1.Delete)('users/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(2, (0, current_user_decorator_1.CurrentUser)('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "deleteUser", null);
__decorate([
    (0, common_1.Get)('bookings'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('pageSize')),
    __param(2, (0, common_1.Query)('venueId')),
    __param(3, (0, common_1.Query)('date')),
    __param(4, (0, common_1.Query)('status')),
    __param(5, (0, common_1.Query)('keyword')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getBookings", null);
__decorate([
    (0, common_1.Get)('logs'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('pageSize')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getLogs", null);
exports.AdminController = AdminController = __decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    (0, common_1.Controller)('admin'),
    __metadata("design:paramtypes", [admin_service_1.AdminService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map