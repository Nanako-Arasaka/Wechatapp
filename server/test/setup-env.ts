import * as path from 'path';

// 测试环境使用独立的 SQLite 数据库，避免与开发/生产数据互相污染
const testDbPath = path.join(__dirname, '../prisma/test-e2e.db');
process.env.DATABASE_URL = `file:${testDbPath}`;
