import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma/prisma.service';
import { MockWechatAuthProvider } from '../common/providers/mock-providers';
import { LoginDto, WechatLoginDto } from './dto/login.dto';
export declare class AuthService {
    private prisma;
    private jwtService;
    private mockWechatAuth;
    private readonly logger;
    private readonly loginAttempts;
    constructor(prisma: PrismaService, jwtService: JwtService, mockWechatAuth: MockWechatAuthProvider);
    login(dto: LoginDto): Promise<{
        token: string;
        user: {
            id: string;
            username: string;
            nickname: string;
            avatar: string;
            phone: string;
            role: string;
        };
    }>;
    wechatLogin(dto: WechatLoginDto): Promise<{
        token: string;
        user: {
            id: string;
            nickname: string;
            avatar: string;
            phone: string;
            role: string;
        };
    }>;
    private verifyPassword;
    private checkRateLimit;
    private recordFailedAttempt;
    getProfile(userId: string): Promise<{
        id: string;
        createdAt: Date;
        username: string;
        nickname: string;
        avatar: string;
        phone: string;
        role: string;
    }>;
}
