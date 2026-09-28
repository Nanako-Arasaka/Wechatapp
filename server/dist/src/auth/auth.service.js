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
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = require("bcryptjs");
const prisma_service_1 = require("../common/prisma/prisma.service");
const mock_providers_1 = require("../common/providers/mock-providers");
const enums_1 = require("../common/enums");
const business_exception_1 = require("../common/exceptions/business.exception");
let AuthService = AuthService_1 = class AuthService {
    constructor(prisma, jwtService, mockWechatAuth) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.mockWechatAuth = mockWechatAuth;
        this.logger = new common_1.Logger(AuthService_1.name);
        this.loginAttempts = new Map();
    }
    async login(dto) {
        this.checkRateLimit(dto.username);
        const user = await this.prisma.user.findUnique({
            where: { username: dto.username },
        });
        if (!user || user.status === 'DISABLED') {
            this.recordFailedAttempt(dto.username);
            throw new business_exception_1.BusinessException('账号或密码错误', business_exception_1.BusinessErrorCode.UNAUTHORIZED);
        }
        const passwordOk = await this.verifyPassword(user, dto.password);
        if (!passwordOk) {
            this.recordFailedAttempt(dto.username);
            throw new business_exception_1.BusinessException('账号或密码错误', business_exception_1.BusinessErrorCode.UNAUTHORIZED);
        }
        this.loginAttempts.delete(dto.username);
        const payload = {
            sub: user.id,
            username: user.username,
            role: user.role,
            nickname: user.nickname,
        };
        const token = this.jwtService.sign(payload);
        return {
            token,
            user: {
                id: user.id,
                username: user.username,
                nickname: user.nickname,
                avatar: user.avatar,
                phone: user.phone,
                role: user.role,
            },
        };
    }
    async wechatLogin(dto) {
        if (!dto.code || !dto.code.startsWith('mock_wx_code_')) {
            throw new business_exception_1.BusinessException('微信登录凭证无效', business_exception_1.BusinessErrorCode.UNAUTHORIZED);
        }
        const authResult = await this.mockWechatAuth.code2Session(dto.code);
        let user = await this.prisma.user.findUnique({
            where: { openid: authResult.openid },
        });
        if (!user) {
            user = await this.prisma.user.create({
                data: {
                    openid: authResult.openid,
                    nickname: dto.nickname || '微信运动用户',
                    avatar: dto.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
                    phone: dto.phone || '13800000008',
                    role: enums_1.Role.USER,
                },
            });
        }
        const payload = {
            sub: user.id,
            role: user.role,
            nickname: user.nickname,
        };
        const token = this.jwtService.sign(payload);
        return {
            token,
            user: {
                id: user.id,
                nickname: user.nickname,
                avatar: user.avatar,
                phone: user.phone,
                role: user.role,
            },
        };
    }
    async verifyPassword(user, plain) {
        if (!user.password)
            return false;
        if (/^\$2[aby]\$/.test(user.password)) {
            return bcrypt.compare(plain, user.password);
        }
        if (user.password === plain) {
            const hash = await bcrypt.hash(plain, 10);
            await this.prisma.user.update({
                where: { id: user.id },
                data: { password: hash },
            });
            this.logger.log(`用户 ${user.id} 的明文密码已自动升级为 bcrypt 哈希`);
            return true;
        }
        return false;
    }
    checkRateLimit(username) {
        const windowStart = Date.now() - 5 * 60 * 1000;
        const attempts = (this.loginAttempts.get(username) || []).filter((t) => t > windowStart);
        if (attempts.length >= 10) {
            throw new business_exception_1.BusinessException('尝试次数过多，请5分钟后再试', business_exception_1.BusinessErrorCode.FORBIDDEN);
        }
    }
    recordFailedAttempt(username) {
        const windowStart = Date.now() - 5 * 60 * 1000;
        const attempts = (this.loginAttempts.get(username) || []).filter((t) => t > windowStart);
        attempts.push(Date.now());
        this.loginAttempts.set(username, attempts);
    }
    async getProfile(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                nickname: true,
                avatar: true,
                phone: true,
                role: true,
                createdAt: true,
            },
        });
        if (!user) {
            throw new business_exception_1.BusinessException('用户不存在', business_exception_1.BusinessErrorCode.NOT_FOUND);
        }
        return user;
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        mock_providers_1.MockWechatAuthProvider])
], AuthService);
//# sourceMappingURL=auth.service.js.map