import { Pool, PoolClient, QueryResult } from 'pg';
import { TEST_CONFIG } from '../setup';

export class DbClient {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      ...TEST_CONFIG.database,
      // 数据库连接不走代理
    });
  }

  async query(sql: string, params?: any[]): Promise<QueryResult> {
    return this.pool.query(sql, params);
  }

  /**
   * 获取 ticketId 对应的降级日志
   */
  async getDegradationLogs(ticketId: string): Promise<any[]> {
    const result = await this.pool.query(
      `SELECT * FROM ai_processing_log
       WHERE details::text LIKE $1
       ORDER BY created_at DESC`,
      [`%${ticketId}%`],
    );
    return result.rows;
  }

  /**
   * 清理测试数据（删除 ticketId 前缀为 test- 的记录）
   */
  async cleanupTestData(): Promise<void> {
    await this.pool.query(
      `DELETE FROM ai_processing_log WHERE details::text LIKE '%test-%'`,
    );
  }

  /**
   * 检查数据库连接是否正常
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 等待数据库就绪
   */
  async waitForReady(maxRetries: number = 20, interval: number = 1500): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      if (await this.healthCheck()) {
        console.log(`✅ Database is ready (attempt ${i + 1}/${maxRetries})`);
        return;
      }
      console.log(`⏳ Waiting for database... (attempt ${i + 1}/${maxRetries})`);
      await new Promise((r) => setTimeout(r, interval));
    }
    throw new Error('Database failed to become ready within timeout');
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
