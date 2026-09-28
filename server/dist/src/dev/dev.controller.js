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
exports.DevController = void 0;
const common_1 = require("@nestjs/common");
const dev_service_1 = require("./dev.service");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const roles_guard_1 = require("../common/guards/roles.guard");
let DevController = class DevController {
    constructor(devService) {
        this.devService = devService;
    }
    async expireOrders() {
        return this.devService.expirePendingOrders();
    }
    async generatePeak() {
        return this.devService.generatePeakTraffic();
    }
};
exports.DevController = DevController;
__decorate([
    (0, common_1.Post)('expire-orders'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DevController.prototype, "expireOrders", null);
__decorate([
    (0, common_1.Post)('generate-peak'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DevController.prototype, "generatePeak", null);
exports.DevController = DevController = __decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN'),
    (0, common_1.Controller)('dev'),
    __metadata("design:paramtypes", [dev_service_1.DevService])
], DevController);
//# sourceMappingURL=dev.controller.js.map