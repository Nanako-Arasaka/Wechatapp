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
  /** tokenVersion：用户表 tokenVersion 递增后旧 token 立即失效 */
  tv?: number;
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
  tokenVersion: true,
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
    // 严格按 token 中的用户 ID 查找，禁止使用 username / role 兜底回退，
    // 防止数据库重置后旧 token 借“同角色第一个用户”登录或伪造角色提权。
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: SAFE_USER_SELECT,
    });

    if (!user || user.status === 'DISABLED') {
      throw new UnauthorizedException('用户不存在或已被禁用');
    }

    // token 中的角色必须与数据库当前角色一致，防止旧 token 在角色变更后越权
    if (payload.role && payload.role !== user.role) {
      throw new UnauthorizedException('登录状态已变更，请重新登录');
    }

    // tokenVersion 吊销机制：管理员禁用/删除账号后，旧 access token 立即失效
    if (payload.tv !== undefined && payload.tv !== user.tokenVersion) {
      throw new UnauthorizedException('登录状态已失效，请重新登录');
    }

    return user;
  }
}
