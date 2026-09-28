import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { getJwtSecret } from './jwt-secret';

export interface JwtPayload {
  sub: string;
  username?: string;
  role: string;
  nickname: string;
}

/** 挂载到 req.user 的安全用户字段（绝不包含 password） */
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
} as const;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(),
    });
  }

  async validate(payload: JwtPayload) {
    // 1. 优先按 UUID 主键查找
    let user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: SAFE_USER_SELECT,
    });

    // 2. 容错保护：若数据库被 reset 重置导致 UUID 变化，按 username 查找演示账户
    if (!user && payload.username) {
      user = await this.prisma.user.findUnique({
        where: { username: payload.username },
        select: SAFE_USER_SELECT,
      });
    }

    // 3. 兜底容错：按角色查找默认演示账户
    if (!user && payload.role) {
      user = await this.prisma.user.findFirst({
        where: { role: payload.role },
        select: SAFE_USER_SELECT,
      });
    }

    if (!user || user.status === 'DISABLED') {
      throw new UnauthorizedException('用户不存在或已被禁用');
    }
    return user;
  }
}
