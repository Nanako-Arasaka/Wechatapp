import { Logger } from '@nestjs/common';

const logger = new Logger('JwtSecret');
let warned = false;

/**
 * 统一获取 JWT 签名密钥：
 * - 生产/部署环境必须通过环境变量 JWT_SECRET 注入；
 * - 本地开发缺省时使用内置开发密钥并打印警告，禁止将真实密钥硬编码进源码。
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 16) {
    return secret;
  }
  if (!warned) {
    logger.warn('未配置 JWT_SECRET 环境变量，正在使用内置开发密钥。生产环境请务必配置 JWT_SECRET（长度≥16）！');
    warned = true;
  }
  return 'SMART_VENUE_DEV_ONLY_FALLBACK_SECRET';
}
