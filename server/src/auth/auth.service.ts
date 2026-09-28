import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../common/prisma/prisma.service';
import { MockWechatAuthProvider } from '../common/providers/mock-providers';
import { LoginDto, WechatLoginDto } from './dto/login.dto';
import { Role } from '../common/enums';
import { BusinessException, BusinessErrorCode } from '../common/exceptions/business.exception';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  // 简易登录限流：每用户名 5 分钟内最多 10 次失败
  private readonly loginAttempts = new Map<string, number[]>();

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mockWechatAuth: MockWechatAuthProvider,
  ) {}

  /**
   * 账号密码登录：后端根据账号密码识别角色，前端不再切换角色
   * 密码统一使用 bcrypt 哈希校验；对历史明文密码做透明升级（验证通过后自动重写为哈希）。
   */
  async login(dto: LoginDto) {
    this.checkRateLimit(dto.username);

    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });

    if (!user || user.status === 'DISABLED') {
      this.recordFailedAttempt(dto.username);
      throw new BusinessException('账号或密码错误', BusinessErrorCode.UNAUTHORIZED);
    }

    const passwordOk = await this.verifyPassword(user, dto.password);
    if (!passwordOk) {
      this.recordFailedAttempt(dto.username);
      throw new BusinessException('账号或密码错误', BusinessErrorCode.UNAUTHORIZED);
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

  /**
   * 模拟微信快捷授权登录
   */
  async wechatLogin(dto: WechatLoginDto) {
    // 仅接受前端模拟登录下发的 mock code，防止任意 code 创建账号
    if (!dto.code || !dto.code.startsWith('mock_wx_code_')) {
      throw new BusinessException('微信登录凭证无效', BusinessErrorCode.UNAUTHORIZED);
    }

    const authResult = await this.mockWechatAuth.code2Session(dto.code);
    let user = await this.prisma.user.findUnique({
      where: { openid: authResult.openid },
    });

    if (!user) {
      // 微信登录不再自动提权，统一按普通用户注册
      user = await this.prisma.user.create({
        data: {
          openid: authResult.openid,
          nickname: dto.nickname || '微信运动用户',
          avatar: dto.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
          phone: dto.phone || '13800000008',
          role: Role.USER,
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

  /**
   * 校验密码：bcrypt 哈希优先；历史明文密码验证通过后自动升级为哈希存储
   */
  private async verifyPassword(user: { id: string; password: string | null }, plain: string): Promise<boolean> {
    if (!user.password) return false;

    // bcrypt 哈希特征：$2a$ / $2b$ / $2y$ 开头
    if (/^\$2[aby]\$/.test(user.password)) {
      return bcrypt.compare(plain, user.password);
    }

    // 历史明文兼容：比对成功后透明升级
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

  private checkRateLimit(username: string) {
    const windowStart = Date.now() - 5 * 60 * 1000;
    const attempts = (this.loginAttempts.get(username) || []).filter((t) => t > windowStart);
    if (attempts.length >= 10) {
      throw new BusinessException('尝试次数过多，请5分钟后再试', BusinessErrorCode.FORBIDDEN);
    }
  }

  private recordFailedAttempt(username: string) {
    const windowStart = Date.now() - 5 * 60 * 1000;
    const attempts = (this.loginAttempts.get(username) || []).filter((t) => t > windowStart);
    attempts.push(Date.now());
    this.loginAttempts.set(username, attempts);
  }

  async getProfile(userId: string) {
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
      throw new BusinessException('用户不存在', BusinessErrorCode.NOT_FOUND);
    }
    return user;
  }
}
