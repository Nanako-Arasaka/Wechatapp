import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // 支持通过 DATABASE_URL 环境变量覆盖数据库地址（测试环境使用独立 test 数据库）
    const url = process.env.DATABASE_URL;
    super(url ? { datasources: { db: { url } } } : undefined as any);
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Prisma connected to SQLite database successfully');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Prisma disconnected');
  }
}
