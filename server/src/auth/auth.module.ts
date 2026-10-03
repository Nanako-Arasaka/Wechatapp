import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { MockWechatAuthProvider } from '../common/providers/mock-providers';
import { getJwtSecret } from './jwt-secret';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: getJwtSecret(),
      // access token 2 小时过期，配合 refresh token（30 天）轮换续期，
      // 缩短泄露窗口；禁用账号通过 tokenVersion 立即吊销。
      signOptions: { expiresIn: '2h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, MockWechatAuthProvider],
  exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}
