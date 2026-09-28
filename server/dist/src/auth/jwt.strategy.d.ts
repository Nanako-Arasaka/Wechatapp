import { Strategy } from 'passport-jwt';
import { PrismaService } from '../common/prisma/prisma.service';
export interface JwtPayload {
    sub: string;
    username?: string;
    role: string;
    nickname: string;
}
declare const JwtStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtStrategy extends JwtStrategy_base {
    private prisma;
    constructor(prisma: PrismaService);
    validate(payload: JwtPayload): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        openid: string;
        username: string;
        nickname: string;
        avatar: string;
        phone: string;
        role: string;
    }>;
}
export {};
