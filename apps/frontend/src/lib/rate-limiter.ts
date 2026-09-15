import { getDbPool } from './db';

/**
 * 速率限制器 - 基于 PostgreSQL 滑动窗口算法
 *
 * 规则：每个 identifier（IP/用户ID）每分钟最多 5 次请求
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

/**
 * 检查速率限制
 * @param identifier - 用户标识（IP 地址或用户 ID）
 * @param endpoint - API 端点（用于分组限制）
 * @param maxRequests - 最大请求数（默认 5）
 * @param windowMs - 时间窗口（毫秒，默认 60000 = 1 分钟）
 */
export async function checkRateLimit(
  identifier: string,
  endpoint: string,
  maxRequests = 5,
  windowMs = 60000,
): Promise<RateLimitResult> {
  const db = getDbPool();
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMs);

  try {
    // 创建表（如果不存在）
    await db.query(`
      CREATE TABLE IF NOT EXISTS rate_limit_log (
        id SERIAL PRIMARY KEY,
        identifier VARCHAR(255) NOT NULL,
        endpoint VARCHAR(255) NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // 创建索引（如果不存在）
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_rate_limit ON rate_limit_log (identifier, endpoint, timestamp)
    `);

    // 清理过期记录（保留最近 5 分钟）
    await db.query(
      `DELETE FROM rate_limit_log WHERE timestamp < $1`,
      [new Date(now.getTime() - 5 * 60000)],
    );

    // 查询时间窗口内的请求数
    const result = await db.query(
      `SELECT COUNT(*) as count FROM rate_limit_log
       WHERE identifier = $1 AND endpoint = $2 AND timestamp >= $3`,
      [identifier, endpoint, windowStart],
    );

    const currentCount = parseInt(result.rows[0]?.count || '0', 10);

    if (currentCount >= maxRequests) {
      // 超过限制
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(now.getTime() + windowMs),
      };
    }

    // 记录本次请求
    await db.query(
      `INSERT INTO rate_limit_log (identifier, endpoint, timestamp) VALUES ($1, $2, $3)`,
      [identifier, endpoint, now],
    );

    return {
      allowed: true,
      remaining: maxRequests - currentCount - 1,
      resetAt: new Date(now.getTime() + windowMs),
    };
  } catch (error) {
    console.error('[rate-limiter] Database error:', error);
    // 数据库错误时放行请求，避免阻塞正常流量
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: new Date(now.getTime() + windowMs),
    };
  }
}

/**
 * 从 NextRequest 中提取客户端标识符（IP 或用户 ID）
 */
export function getClientIdentifier(req: Request): string {
  // 尝试从 headers 中获取真实 IP（考虑反向代理）
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0]?.trim() || realIp || 'unknown';

  // 可以扩展：如果有用户认证，优先使用用户 ID
  // const userId = req.headers.get('x-user-id');
  // return userId || ip;

  return ip;
}
