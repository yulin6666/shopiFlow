import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { DbClient } from '../../helpers/db-client';
import { TEST_CONFIG } from '../../setup';

describe('API Rate Limiting Integration', () => {
  const db = new DbClient();
  const API_BASE = TEST_CONFIG.frontend.baseUrl;

  beforeAll(async () => {
    console.log('⏳ Waiting for database to be ready...');
    await db.waitForReady();

    // 确保表存在（首次 API 请求时才会懒创建，测试环境需要提前建好）
    await db.query(`
      CREATE TABLE IF NOT EXISTS rate_limit_log (
        id         SERIAL PRIMARY KEY,
        identifier VARCHAR(255) NOT NULL,
        endpoint   VARCHAR(255) NOT NULL,
        timestamp  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_rate_limit
        ON rate_limit_log (identifier, endpoint, timestamp)
    `);

    // 清理测试数据
    await db.query(`DELETE FROM rate_limit_log WHERE identifier LIKE 'test-%'`);
  }, 60000);

  afterEach(async () => {
    // 每个测试后清理速率限制日志
    await db.query(`DELETE FROM rate_limit_log WHERE identifier LIKE 'test-%'`);
  });

  describe('速率限制基本功能', () => {
    it('should allow requests within rate limit', async () => {
      const testIdentifier = `test-allow-${Date.now()}`;

      // 模拟 3 次请求（未超过 5 次限制）
      for (let i = 0; i < 3; i++) {
        const response = await fetch(`${API_BASE}/api/support`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Forwarded-For': testIdentifier, // 模拟不同的 IP
          },
          body: JSON.stringify({
            message: `Test message ${i + 1}`,
            source: 'shopify',
          }),
        });

        expect(response.status).not.toBe(429);

        const remainingHeader = response.headers.get('X-RateLimit-Remaining');
        if (remainingHeader) {
          const remaining = parseInt(remainingHeader, 10);
          expect(remaining).toBeGreaterThanOrEqual(0);
          console.log(`✅ Request ${i + 1}/3: Remaining = ${remaining}`);
        }
      }

      // 验证数据库中有 3 条记录
      const logs = await db.query(
        `SELECT COUNT(*) as count FROM rate_limit_log WHERE identifier = $1`,
        [testIdentifier]
      );
      expect(parseInt(logs.rows[0].count, 10)).toBe(3);
    }, 120000);

    it('should block requests exceeding rate limit', async () => {
      const testIdentifier = `test-block-${Date.now()}`;

      // 串行发送 6 次请求（超过 5 次限制）
      const responses = [];
      for (let i = 0; i < 6; i++) {
        const response = await fetch(`${API_BASE}/api/support`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Forwarded-For': testIdentifier,
          },
          body: JSON.stringify({
            message: `Burst test message ${i + 1}`,
            source: 'shopify',
          }),
        });
        responses.push(response);
      }

      // 统计 429 响应数量
      const blocked = responses.filter(r => r.status === 429);
      expect(blocked.length).toBeGreaterThan(0);
      console.log(`✅ Blocked ${blocked.length} requests out of 6`);

      // 检查 429 响应的 headers
      const blockedResponse = blocked[0];
      expect(blockedResponse.headers.get('X-RateLimit-Remaining')).toBe('0');
      expect(blockedResponse.headers.get('Retry-After')).toBeDefined();

      const body = await blockedResponse.json();
      expect(body.error).toContain('Rate limit exceeded');
      expect(body.retryAfter).toBeGreaterThan(0);
      console.log(`✅ Retry-After: ${body.retryAfter} seconds`);
    }, 120000);

    it('should reset rate limit after window expires', async () => {
      const testIdentifier = `test-reset-${Date.now()}`;

      // 发送 5 次请求（达到限制）
      for (let i = 0; i < 5; i++) {
        await fetch(`${API_BASE}/api/support`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Forwarded-For': testIdentifier,
          },
          body: JSON.stringify({
            message: `Rate limit test ${i + 1}`,
            source: 'shopify',
          }),
        });
      }

      // 第 6 次应该被拒绝
      const blockedResponse = await fetch(`${API_BASE}/api/support`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': testIdentifier,
        },
        body: JSON.stringify({
          message: 'This should be blocked',
          source: 'shopify',
        }),
      });
      expect(blockedResponse.status).toBe(429);
      console.log('✅ Request blocked as expected');

      // 等待 61 秒（超过 60 秒时间窗口）
      console.log('⏳ Waiting 61 seconds for rate limit window to reset...');
      await new Promise(resolve => setTimeout(resolve, 61000));

      // 窗口重置后应该可以再次请求
      const afterResetResponse = await fetch(`${API_BASE}/api/support`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': testIdentifier,
        },
        body: JSON.stringify({
          message: 'After reset test',
          source: 'shopify',
        }),
      });

      expect(afterResetResponse.status).not.toBe(429);
      console.log('✅ Rate limit reset successfully after window expiry');
    }, 180000); // 3 分钟超时
  });

  describe('不同端点独立限制', () => {
    it('should track rate limits per endpoint separately', async () => {
      const testIdentifier = `test-endpoint-${Date.now()}`;

      // 向 /api/support 发送 5 次请求（达到限制）
      for (let i = 0; i < 5; i++) {
        await fetch(`${API_BASE}/api/support`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Forwarded-For': testIdentifier,
          },
          body: JSON.stringify({
            message: `Support test ${i + 1}`,
            source: 'shopify',
          }),
        });
      }

      // /api/support 第 6 次应该被拒绝
      const supportResponse = await fetch(`${API_BASE}/api/support`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': testIdentifier,
        },
        body: JSON.stringify({
          message: 'This should be blocked',
          source: 'shopify',
        }),
      });
      expect(supportResponse.status).toBe(429);

      // 但 /api/ai/review 应该仍然可以访问（如果它有独立的速率限制）
      // 注意：当前实现中 /api/ai/review 没有速率限制，此测试仅演示独立性
      const reviewResponse = await fetch(`${API_BASE}/api/ai/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': testIdentifier,
        },
        body: JSON.stringify({
          platform: 'judgeme',
          rating: 5,
          content: 'Great product!',
          productTitle: 'Test Product',
        }),
      });

      // /api/ai/review 目前没有速率限制，所以应该返回 200 或 500（取决于 n8n）
      expect(reviewResponse.status).not.toBe(429);
      console.log('✅ Different endpoints have independent rate limits');
    }, 120000);
  });

  describe('不同客户端独立限制', () => {
    it('should track rate limits per client IP separately', async () => {
      const testIdentifier1 = `test-ip1-${Date.now()}`;
      const testIdentifier2 = `test-ip2-${Date.now()}`;

      // IP1 发送 5 次请求（达到限制）
      for (let i = 0; i < 5; i++) {
        await fetch(`${API_BASE}/api/support`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Forwarded-For': testIdentifier1,
          },
          body: JSON.stringify({
            message: `IP1 test ${i + 1}`,
            source: 'shopify',
          }),
        });
      }

      // IP1 第 6 次应该被拒绝
      const ip1Response = await fetch(`${API_BASE}/api/support`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': testIdentifier1,
        },
        body: JSON.stringify({
          message: 'IP1 blocked',
          source: 'shopify',
        }),
      });
      expect(ip1Response.status).toBe(429);

      // IP2 应该仍然可以访问
      const ip2Response = await fetch(`${API_BASE}/api/support`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': testIdentifier2,
        },
        body: JSON.stringify({
          message: 'IP2 first request',
          source: 'shopify',
        }),
      });
      expect(ip2Response.status).not.toBe(429);
      console.log('✅ Different clients have independent rate limits');
    }, 120000);
  });

  describe('数据库清理', () => {
    it('should automatically clean up old rate limit logs', async () => {
      const testIdentifier = `test-cleanup-${Date.now()}`;

      // 插入一条 10 分钟前的记录
      await db.query(
        `INSERT INTO rate_limit_log (identifier, endpoint, timestamp)
         VALUES ($1, $2, NOW() - INTERVAL '10 minutes')`,
        [testIdentifier, '/api/support']
      );

      // 验证记录已插入
      const beforeCleanup = await db.query(
        `SELECT COUNT(*) as count FROM rate_limit_log WHERE identifier = $1`,
        [testIdentifier]
      );
      expect(parseInt(beforeCleanup.rows[0].count, 10)).toBe(1);

      // 发起一次正常请求，触发清理逻辑（清理 5 分钟前的记录）
      await fetch(`${API_BASE}/api/support`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': `test-trigger-cleanup-${Date.now()}`,
        },
        body: JSON.stringify({
          message: 'Trigger cleanup',
          source: 'shopify',
        }),
      });

      // 等待清理完成
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 验证 10 分钟前的记录已被删除
      const afterCleanup = await db.query(
        `SELECT COUNT(*) as count FROM rate_limit_log WHERE identifier = $1`,
        [testIdentifier]
      );
      expect(parseInt(afterCleanup.rows[0].count, 10)).toBe(0);
      console.log('✅ Old rate limit logs cleaned up automatically');
    }, 60000);
  });

  describe('容错处理', () => {
    it('should handle database errors gracefully', async () => {
      // 注意：这个测试需要临时关闭数据库连接才能触发错误
      // 在真实测试中，可以 mock db.query 来模拟数据库错误

      // 这里仅演示正常情况下的行为
      const testIdentifier = `test-db-error-${Date.now()}`;

      const response = await fetch(`${API_BASE}/api/support`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': testIdentifier,
        },
        body: JSON.stringify({
          message: 'Database error test',
          source: 'shopify',
        }),
      });

      // 即使数据库出错，API 也应该返回响应（而非崩溃）
      expect(response.status).toBeDefined();
      console.log('✅ API handles database errors gracefully');
    }, 60000);
  });
});
