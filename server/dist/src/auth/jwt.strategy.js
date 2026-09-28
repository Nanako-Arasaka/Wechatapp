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
exports.JwtStrategy = void 0;
const passport_jwt_1 = require("passport-jwt");
const passport_1 = require("@nestjs/passport");
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma/prisma.service");
const jwt_secret_1 = require("./jwt-secret");
const SAFE_USER_SELECT = {
    id: true,
    openid: true,
    username: true,
    nickname: true,
    avatar: true,
    phone: true,
    role: true,
    status: true,
    createdAt: true,
};
let JwtStrategy = class JwtStrategy extends (0, passport_1.PassportStrategy)(passport_jwt_1.Strategy) {
    constructor(prisma) {
        super({
            jwtFromRequest: passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: (0, jwt_secret_1.getJwtSecret)(),
        });
        this.prisma = prisma;
    }
    async validate(payload) {
        let user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
            select: SAFE_USER_SELECT,
        });
        if (!user && payload.username) {
            user = await this.prisma.user.findUnique({
                where: { username: payload.username },
                select: SAFE_USER_SELECT,
            });
        }
        if (!user && payload.role) {
            user = await this.prisma.user.findFirst({
                where: { role: payload.role },
                select: SAFE_USER_SELECT,
            });
        }
        if (!user || user.status === 'DISABLED') {
            throw new common_1.UnauthorizedException('用户不存在或已被禁用');
        }
        return user;
    }
};
exports.JwtStrategy = JwtStrategy;
exports.JwtStrategy = JwtStrategy = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], JwtStrategy);
//# sourceMappingURL=jwt.strategy.js.map