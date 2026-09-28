import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // 允许跨域请求（方便调试与开发）
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // 全局 API 前缀
  app.setGlobalPrefix('api');

  const PORT = process.env.PORT || 3000;
  // 监听 0.0.0.0，支持局域网内手机真机扫码调试访问
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
