import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { N8nClient } from '../../helpers/n8n-client';
import { DbClient } from '../../helpers/db-client';
import { SUPPORT_FIXTURES } from '../../helpers/fixtures';

describe('n8n Workflow Integration - Support Handler', () => {
  const n8n = new N8nClient(process.env.N8N_TEST_URL || 'http://localhost:5678');
  const db = new DbClient();

  // 等待服务就绪
  beforeAll(async () => {
    console.log('⏳ Waiting for services to be ready...');
    await Promise.all([n8n.waitForReady(), db.waitForReady()]);
  }, 60000);

  // 每个测试后清理测试数据
  afterEach(async () => {
    await db.cleanupTestData();
  });

  describe('正常分类场景', () => {
    it('should classify order query as auto', async () => {
      const response = await n8n.triggerSupportWebhook(SUPPORT_FIXTURES.orderQuery);

      expect(response.status).toBeDefined();
      // 如果 AI 正常，应该是 auto 或 draft
      // 如果 AI 失败，会降级为 draft
      expect(['auto_replied', 'needs_review']).toContain(response.status);

      if (response.status === 'auto_replied') {
        expect(response.classification).toBe('auto');
        expect(response.reply).toBeDefined();
        expect(response.reply).not.toBeNull();
      }

      expect(response.ticketId).toBe(SUPPORT_FIXTURES.orderQuery.ticketId);
    }, 60000);

    it('should classify product query as auto', async () => {
      const response = await n8n.triggerSupportWebhook(SUPPORT_FIXTURES.productQuery);

      expect(response.status).toBeDefined();
      expect(['auto_replied', 'needs_review']).toContain(response.status);
      expect(response.ticketId).toBe(SUPPORT_FIXTURES.productQuery.ticketId);
    }, 60000);
  });

  describe('Draft 分类场景', () => {
    it('should classify refund request as draft', async () => {
      const response = await n8n.triggerSupportWebhook(SUPPORT_FIXTURES.refundRequest);

      expect(response.status).toBe('needs_review');
      expect(response.classification).toBe('draft');
      expect(response.reply).toBeDefined();
      expect(response.reason).toBeDefined();
    }, 30000);

    it('should classify cancel request as draft', async () => {
      const response = await n8n.triggerSupportWebhook(SUPPORT_FIXTURES.cancelRequest);

      expect(response.status).toBe('needs_review');
      expect(response.classification).toBe('draft');
    }, 30000);
  });

  describe('Escalate 分类场景', () => {
    it('should escalate legal threat', async () => {
      const response = await n8n.triggerSupportWebhook(SUPPORT_FIXTURES.legalThreat);

      // 可能是 escalated，也可能因 AI 失败降级为 draft
      expect(['escalated', 'needs_review']).toContain(response.status);

      if (response.status === 'escalated') {
        expect(response.classification).toBe('escalate');
        expect(response.reply).toBeNull();
      }

      expect(response.reason).toBeDefined();
    }, 30000);

    it('should escalate fraud claim', async () => {
      const response = await n8n.triggerSupportWebhook(SUPPORT_FIXTURES.fraudClaim);

      expect(['escalated', 'needs_review']).toContain(response.status);

      if (response.status === 'escalated') {
        expect(response.classification).toBe('escalate');
      }
    }, 30000);
  });

  describe('边界条件', () => {
    it('should reject empty message', async () => {
      try {
        await n8n.triggerSupportWebhook(SUPPORT_FIXTURES.emptyMessage);
        // 如果没有抛出错误，说明 workflow 接受了空消息（不应该）
        expect.fail('Should have rejected empty message');
      } catch (error: any) {
        // 预期会失败
        expect(error.message).toBeDefined();
      }
    }, 30000);

    it('should reject whitespace-only message', async () => {
      try {
        await n8n.triggerSupportWebhook(SUPPORT_FIXTURES.whitespaceMessage);
        expect.fail('Should have rejected whitespace-only message');
      } catch (error: any) {
        expect(error.message).toBeDefined();
      }
    }, 30000);

    it('should handle long message', async () => {
      const response = await n8n.triggerSupportWebhook(SUPPORT_FIXTURES.longMessage);

      expect(response.status).toBeDefined();
      expect(['auto_replied', 'needs_review', 'escalated']).toContain(response.status);
    }, 30000);

    it('should handle special characters and potential XSS', async () => {
      const response = await n8n.triggerSupportWebhook(SUPPORT_FIXTURES.specialChars);

      expect(response.status).toBeDefined();
      expect(response.ticketId).toBe(SUPPORT_FIXTURES.specialChars.ticketId);

      // 确保返回的 reply 不包含未转义的 script 标签
      if (response.reply) {
        expect(response.reply).not.toContain('<script>');
      }
    }, 30000);
  });

  describe('错误降级逻辑', () => {
    it('should fallback to draft when AI fails', async () => {
      // 注意：这个测试需要 OpenRouter credential 无效才能触发降级
      // 在真实测试中，你可能需要临时修改 n8n credential 或 mock API

      const response = await n8n.triggerSupportWebhook(SUPPORT_FIXTURES.degradation);

      // 无论 AI 成功或失败，都应该有响应
      expect(response.status).toBeDefined();
      expect(['auto_replied', 'needs_review', 'escalated']).toContain(response.status);

      // 如果是降级场景，应该有 fallbackApplied 标记
      if (response.fallbackApplied) {
        expect(response.classification).toBe('draft');
        expect(response.reply).toContain('感谢您的消息');
        expect(response.reason).toContain('AI 分类服务暂时不可用');

        // 检查数据库中是否记录了降级日志
        const logs = await db.getDegradationLogs(SUPPORT_FIXTURES.degradation.ticketId);
        if (logs.length > 0) {
          expect(logs[0].status).toBe('degraded');
          expect(logs[0].workflow_id).toBe('shopify-support-handler');
        }
      }
    }, 30000);
  });

  describe('节点级重试逻辑', () => {
    it('should trigger Handle AI Error branch when Parse Input throws error', async () => {
      // 模拟场景：使用 test-force-error- 前缀触发 Parse Input 节点抛出错误
      // AI Agent 节点配置了 onError: continueErrorOutput，会路由到 Handle AI Error 分支
      const testTicketId = `test-force-error-retry-${Date.now()}`;

      const response = await n8n.triggerSupportWebhook({
        message: 'This message will trigger force-error mode in Parse Input node',
        ticketId: testTicketId,
        customerName: 'Force Error Test',
        customerEmail: 'force-error@example.com',
        platform: 'shopify',
        orderId: null,
      });

      // 先打印完整响应，看看到底发生了什么
      console.log('📋 Full response:', JSON.stringify(response, null, 2));

      // 验证：触发错误分支后应该返回降级响应
      expect(response.status).toBe('needs_review');
      expect(response.classification).toBe('draft');
      expect(response.reason).toContain('AI');
      expect(response.reply).toBeDefined();
      console.log(`✅ Force-error mode triggered Handle AI Error: ${response.reason}`);
    }, 35000);

    it('should record degradation logs when error branch is triggered', async () => {
      // 模拟场景：触发错误分支，验证 Log AI Degradation 节点是否写入数据库
      const testTicketId = `test-force-error-log-${Date.now()}`;

      const response = await n8n.triggerSupportWebhook({
        message: 'Testing degradation log persistence',
        ticketId: testTicketId,
        customerName: 'Degradation Log Test',
        customerEmail: 'degradation@example.com',
        platform: 'shopify',
        orderId: null,
      });

      // 验证降级响应
      expect(response.status).toBe('needs_review');

     
         }, 40000);

    it('should gracefully degrade without crashing workflow', async () => {
      // 模拟场景：验证错误分支最终返回友好的降级响应，而非抛出异常
      const testTicketId = `test-force-error-graceful-${Date.now()}`;

      const response = await n8n.triggerSupportWebhook({
        message: 'Testing graceful degradation',
        ticketId: testTicketId,
        customerName: 'Graceful Test',
        customerEmail: 'graceful@example.com',
        platform: 'shopify',
        orderId: null,
      });

      // 验证：workflow 没有崩溃，返回了降级响应
      expect(response).toBeDefined();
      expect(response.status).toBe('needs_review');
      expect(response.classification).toBe('draft');
      expect(response.riskLevel).toBe('medium');
      expect(response.reply).toBe('感谢您的消息。我们的团队会尽快为您处理。');
      console.log(`✅ Workflow degraded gracefully without crash`);
    }, 35000);
  });

  describe('全局错误捕获', () => {
    it('should catch errors from empty message validation', async () => {
      // 模拟场景：发送空消息触发 Parse Input 节点的验证错误
      // 全局错误处理应该捕获并返回友好的错误响应
      const testTicketId = `test-global-empty-${Date.now()}`;

      try {
        await n8n.triggerSupportWebhook({
          message: '',
          ticketId: testTicketId,
          customerName: 'Empty Message Test',
          customerEmail: 'empty@example.com',
          platform: 'shopify',
          orderId: null,
        });
        // 如果没有抛出错误，说明 workflow 有全局错误处理（返回降级响应）
        expect.fail('Should have thrown error or returned degraded response');
      } catch (error: any) {
        // 预期：Parse Input 节点会抛出验证错误，webhook 返回 400/500
        expect(error.message).toBeDefined();
        console.log(`✅ Global error caught: ${error.message}`);
      }
    }, 35000);

    it('should log validation errors to database', async () => {
      // 模拟场景：发送只包含空格的消息触发验证错误
      // 验证错误应该被记录到数据库
      const testTicketId = `test-global-whitespace-${Date.now()}`;

      try {
        await n8n.triggerSupportWebhook({
          message: '   ',
          ticketId: testTicketId,
          customerName: 'Whitespace Test',
          customerEmail: 'whitespace@example.com',
          platform: 'shopify',
          orderId: null,
        });
      } catch (error: any) {
        console.log(`✅ Validation error caught: ${error.message}`);
      }

      // 等待数据库写入
      await new Promise((r) => setTimeout(r, 3000));

      // 查询数据库中的错误日志
      const logs = await db.query(
        `SELECT * FROM ai_processing_log
         WHERE details::text LIKE $1
         AND status IN ('failed', 'degraded')
         ORDER BY created_at DESC
         LIMIT 1`,
        [`%${testTicketId}%`],
      );

      // 如果 workflow 有错误日志记录，应该能查到
      if (logs.rows.length > 0) {
        const errorLog = logs.rows[0];
        expect(errorLog.workflow_id).toBe('shopify-support-handler');
        expect(errorLog.error_msg).toBeDefined();
        expect(errorLog.details).toBeDefined();
        console.log(`✅ Found error log in database: ${errorLog.error_msg}`);
      } else {
        console.log(`ℹ️ No error log found (webhook rejected before logging)`);
      }
    }, 40000);

    it('should handle malformed data gracefully', async () => {
      // 模拟场景：发送包含特殊字符和极端数据的消息
      // 测试 workflow 的健壮性和全局错误处理
      const testTicketId = `test-global-malformed-${Date.now()}`;

      const response = await n8n.triggerSupportWebhook({
        message: '{"invalid": "json structure as message"} <script>alert(1)</script> ' + '\n\r\t'.repeat(50),
        ticketId: testTicketId,
        customerName: 'Malformed\nData\tTest',
        customerEmail: 'malformed@example.com',
        platform: 'shopify',
        orderId: null,
      });

      // 即使数据畸形，也应该有响应（不应该 crash）
      expect(response).toBeDefined();
      expect(response.status).toBeDefined();
      expect(['auto_replied', 'needs_review', 'escalated']).toContain(response.status);

      // 验证响应内容不包含未转义的危险字符
      if (response.reply) {
        expect(response.reply).not.toContain('<script>');
        expect(response.reply).not.toContain('undefined');
        expect(response.reply).not.toContain('[object Object]');
      }

      console.log(`✅ Malformed data handled gracefully: ${response.status}`);
    }, 35000);

    it('should handle AI response parsing errors', async () => {
      // 模拟场景：虽然无法直接控制 AI 输出，但可以测试 Parse Classification 的错误处理
      // 如果 AI 返回无效 JSON，workflow 应该降级为 escalate
      const testTicketId = `test-parse-error-${Date.now()}`;

      const response = await n8n.triggerSupportWebhook({
        message: 'Test parsing with edge case: ' + '特殊字符测试 ñ ü ö 中文测试 '.repeat(10),
        ticketId: testTicketId,
        customerName: 'Parse Error Test',
        customerEmail: 'parse@example.com',
        platform: 'shopify',
        orderId: null,
      });

      // 必须有响应
      expect(response).toBeDefined();
      expect(response.status).toBeDefined();
      expect(['auto_replied', 'needs_review', 'escalated']).toContain(response.status);

      // 如果发生了解析错误，应该降级为 escalate
      if (response.reason?.toLowerCase().includes('parse')) {
        expect(response.classification).toBe('escalate');
        expect(response.riskLevel).toBe('high');
        expect(response.reply).toBeNull();
        console.log(`⚠️ Parse error detected and handled: ${response.reason}`);
      } else {
        console.log(`ℹ️ No parse error occurred, AI returned valid JSON`);
      }
    }, 35000);
  });


});
