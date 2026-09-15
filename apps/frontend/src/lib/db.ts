import { Pool } from 'pg';

let pool: Pool | null = null;

/**
 * 获取 PostgreSQL 连接池（单例模式）
 * 用于 Next.js API routes 中查询数据库
 */
export function getDbPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return pool;
}

/**
 * 执行 SQL 查询
 * @param sql SQL 语句
 * @param params 参数化查询参数
 * @returns 查询结果行数组
 */
export async function queryDb<T = any>(sql: string, params?: any[]): Promise<T[]> {
  const db = getDbPool();
  const result = await db.query(sql, params);
  return result.rows;
}
