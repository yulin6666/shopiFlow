#!/usr/bin/env tsx
/**
 * 清理测试数据库所有数据
 * 用法: npx ts-node scripts/reset-test-db.ts
 */

import { Client } from 'pg';
import * as dotenv from 'dotenv';

// 加载 .env.test（假设从项目根目录运行）
dotenv.config({ path: '.env.test' });

const client = new Client({
  host: process.env.TEST_DB_HOST,
  port: Number(process.env.TEST_DB_PORT),
  database: process.env.TEST_DB_NAME,
  user: process.env.TEST_DB_USER,
  password: process.env.TEST_DB_PASSWORD,
  // Railway 需要 SSL，本地/CI Docker postgres 不需要
  ssl: process.env.TEST_DB_HOST !== 'localhost' ? { rejectUnauthorized: false } : false,
});

async function resetDatabase() {
  await client.connect();
  console.log('✅ 已连接到测试数据库');

  try {
    // 查询所有用户表（排除系统表）
    const tablesRes = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);

    const tables = tablesRes.rows.map((r: { tablename: string }) => r.tablename);

    if (tables.length === 0) {
      console.log('ℹ️  数据库中没有表');
      return;
    }

    console.log(`\n📋 发现 ${tables.length} 张表:`);
    tables.forEach((t: string) => console.log(`   - ${t}`));

    // 禁用外键约束，批量 TRUNCATE
    await client.query('BEGIN');
    await client.query('SET session_replication_role = replica;');

    for (const table of tables) {
      await client.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE;`);
      console.log(`🗑️  已清空: ${table}`);
    }

    await client.query('SET session_replication_role = DEFAULT;');
    await client.query('COMMIT');

    console.log('\n✅ 所有表数据已清空！');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ 清理失败:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

resetDatabase();
