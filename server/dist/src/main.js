"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
async function bootstrap() {
    const logger = new common_1.Logger('Bootstrap');
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.enableCors({
        origin: '*',
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        credentials: true,
    });
    app.setGlobalPrefix('api');
    const PORT = process.env.PORT || 3000;
    await app.listen(PORT, '0.0.0.0');
    logger.log(`========================================================`);
    logger.log(`🚀 Slotify (智场通) 服务端已成功启动并监听端口: ${PORT}`);
    logger.log(`📡 本地调试地址: http://127.0.0.1:${PORT}/api`);
    logger.log(`📱 手机真机局域网地址: http://192.168.31.127:${PORT}/api`);
    logger.log(`🏸 场馆与余量接口: http://192.168.31.127:${PORT}/api/venues`);
    logger.log(`📊 管理端数据看板: http://192.168.31.127:${PORT}/api/admin/dashboard`);
    logger.log(`========================================================`);
}
bootstrap();
//# sourceMappingURL=main.js.map