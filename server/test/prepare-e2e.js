/**
 * E2E 测试前置准备：
 * 1. 删除旧的测试数据库文件
 * 2. prisma db push 同步表结构
 * 3. 执行 seed 脚本灌入演示数据
 *
 * 通过 node 执行（跨平台），不使用 shell 环境变量语法。
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const testDbPath = path.join(__dirname, '../prisma/test-e2e.db');
process.env.DATABASE_URL = `file:${testDbPath}`;

// 1. 删除旧测试库，保证每次测试都是干净数据
if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
  console.log('🧹 已删除旧的测试数据库:', testDbPath);
}

function run(cmd, args, label) {
  console.log(`▶ ${label}...`);
  const res = spawnSync(cmd, args, {
    env: process.env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (res.status !== 0) {
    console.error(`❌ ${label} 失败 (exit ${res.status})`);
    process.exit(res.status || 1);
  }
}

// 2. 同步表结构（使用独立的 test schema，不重新生成客户端）
run('npx', ['prisma', 'db', 'push', '--schema', 'prisma/schema.test.prisma', '--skip-generate'], '同步测试数据库表结构');

// 3. 灌入种子数据
run('npx', ['ts-node', 'prisma/seed.ts'], '灌入种子数据');

console.log('✅ 测试数据库准备完成');
