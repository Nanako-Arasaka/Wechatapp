"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getJwtSecret = getJwtSecret;
const common_1 = require("@nestjs/common");
const logger = new common_1.Logger('JwtSecret');
let warned = false;
function getJwtSecret() {
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
//# sourceMappingURL=jwt-secret.js.map