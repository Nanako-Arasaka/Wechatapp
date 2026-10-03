import { Logger } from '@nestjs/common';

const logger = new Logger('JwtSecret');
let warned = false;

/**
 * 统一获取 JWT 签名密钥：
 * - 生产环境（NODE_ENV=production）必须通过环境变量 JWT_SECRET 注入，否则直接抛错禁止启动；
 * - 本地开发缺省时使用内置开发密钥并打印警告，禁止将真实密钥硬编码进源码。
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 16) {
    return secret;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '生产环境必须配置 JWT_SECRET 环境变量（长度≥16），拒绝使用内置开发密钥启动！',
    );
  }
  if (!warned) {
    logger.warn('未配置 JWT_SECRET 环境变量，正在使用内置开发密钥。生产环境请务必配置 JWT_SECRET（长度≥16）！');
    warned = true;
  }
  return 'SMART_VENUE_DEV_ONLY_FALLBACK_SECRET';
}
