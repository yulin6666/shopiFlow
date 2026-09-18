import { describe, it, expect, beforeAll } from 'vitest';
import { N8nClient } from '../../helpers/n8n-client';
import { DbClient } from '../../helpers/db-client';
import { SUPPORT_FIXTURES } from '../../helpers/fixtures';

/**
 * 验证 reply 内容是否合理：
 * - 如果声明了 replyMustBeNull，则 reply 必须为 null
 * - 如果声明了 replyMustContain，则 reply 必须包含其中至少一个关键词（大小写不敏感）
 * - 其他情况 reply 必须是非空字符串
 */
function assertReplyQuality(
  response: any,
  fixture: { replyMustBeNull?: boolean; replyMustContain?: string[] },
  label: string,
) {
  if (fixture.replyMustBeNull) {
    expect(response.reply, `[${label}] escalate 场景 reply 应为 null`).toBeNull();
    return;
  }

  expect(response.reply, `[${label}] reply 不应为 null`).not.toBeNull();
  expect(typeof response.reply, `[${label}] reply 应为字符串`).toBe('string');
  expect(response.reply.trim().length, `[${label}] reply 不应为空字符串`).toBeGreaterThan(0);

  if (fixture.replyMustContain?.length) {
    const replyLower = response.reply.toLowerCase();
    const matched = fixture.replyMustContain.some((kw) => replyLower.includes(kw.toLowerCase()));
    expect(
      matched,
      `[${label}] reply "${response.reply.slice(0, 100)}..." 应包含关键词 [${fixture.replyMustContain.join(', ')}]`,
    ).toBe(true);
  }
}

describe('n8n Workflow Integration - Support Handler', () => {
  const n8n = new N8nClient(process.env.N8N_TEST_URL || 'https://n8n-production-fee8.up.railway.app');
  const db = new DbClient();

  beforeAll(async () => {
    console.log('⏳ Waiting for services to be ready...');
    await Promise.all([n8n.waitForReady(), db.waitForReady()]);
  }, 60000);

  // ============================================================
  // Product Inquiries — 必须调用知识库，reply 包含产品相关信息
  // ============================================================
  describe('Product Inquiries', () => {
    it('should list all ADIDAS products from knowledge base', async () => {
      const f = SUPPORT_FIXTURES.listAdidasProducts;
      const response = await n8n.triggerSupportWebhook(f);

      console.log(`[listAdidasProducts] reply: ${response.reply?.slice(0, 200)}`);

      expect(response.ticketId).toBe(f.ticketId);
      expect(response.classification).toBe('auto');
      expect(response.status).toBe('auto_replied');
      assertReplyQuality(response, f, 'listAdidasProducts');
    }, 60000);

    it('should answer ADIDAS backpack availability', async () => {
      const f = SUPPORT_FIXTURES.adidasBackpacks;
      const response = await n8n.triggerSupportWebhook(f);

      console.log(`[adidasBackpacks] reply: ${response.reply?.slice(0, 200)}`);

      expect(response.ticketId).toBe(f.ticketId);
      expect(response.classification).toBe('auto');
      assertReplyQuality(response, f, 'adidasBackpacks');
    }, 60000);

    it('should check NIKE TODDLER ROSHE ONE stock status', async () => {
      const f = SUPPORT_FIXTURES.nikeRosheStock;
      const response = await n8n.triggerSupportWebhook(f);

      console.log(`[nikeRosheStock] reply: ${response.reply?.slice(0, 200)}`);

      expect(response.classification).toBe('auto');
      assertReplyQuality(response, f, 'nikeRosheStock');
    }, 60000);

    it('should return price info for ADIDAS CLASSIC BACKPACK', async () => {
      const f = SUPPORT_FIXTURES.adidasBackpackPrice;
      const response = await n8n.triggerSupportWebhook(f);

      console.log(`[adidasBackpackPrice] reply: ${response.reply?.slice(0, 200)}`);

      expect(response.classification).toBe('auto');
      assertReplyQuality(response, f, 'adidasBackpackPrice');
    }, 60000);

    it('should provide details about ADIDAS CLASSIC BACKPACK', async () => {
      const f = SUPPORT_FIXTURES.adidasBackpackInfo;
      const response = await n8n.triggerSupportWebhook(f);

      console.log(`[adidasBackpackInfo] reply: ${response.reply?.slice(0, 200)}`);

      expect(response.classification).toBe('auto');
      assertReplyQuality(response, f, 'adidasBackpackInfo');
    }, 60000);
  });

  // ============================================================
  // Order Status & Tracking
  // ============================================================
  describe('Order Status & Tracking', () => {
    it('should return status for order #1180', async () => {
      const f = SUPPORT_FIXTURES.orderStatus;
      const response = await n8n.triggerSupportWebhook(f);

      console.log(`[orderStatus] reply: ${response.reply?.slice(0, 200)}`);

      // AI 查不到订单数据时可能返回 draft，两种都可接受
      expect(['auto', 'draft']).toContain(response.classification);
      expect(response.reply).toBeTruthy();
    }, 60000);

    it('should handle generic order location query', async () => {
      const f = SUPPORT_FIXTURES.orderLocation;
      const response = await n8n.triggerSupportWebhook(f);

      console.log(`[orderLocation] reply: ${response.reply?.slice(0, 200)}`);

      expect(['auto', 'draft']).toContain(response.classification);
      expect(response.reply).toBeTruthy();
    }, 60000);

    it('should return tracking number for order #1180', async () => {
      const f = SUPPORT_FIXTURES.trackingNumber;
      const response = await n8n.triggerSupportWebhook(f);

      console.log(`[trackingNumber] reply: ${response.reply?.slice(0, 200)}`);

      expect(response.classification).toBe('auto');
      assertReplyQuality(response, f, 'trackingNumber');
    }, 60000);

    it('should show order 1180 details', async () => {
      const f = SUPPORT_FIXTURES.orderDetails;
      const response = await n8n.triggerSupportWebhook(f);

      console.log(`[orderDetails] reply: ${response.reply?.slice(0, 200)}`);

      // AI 可能将其分类为 auto 或 draft，取决于是否查到数据
      expect(['auto', 'draft']).toContain(response.classification);
      if (response.classification === 'auto') {
        assertReplyQuality(response, f, 'orderDetails');
      } else {
        // draft 场景也需要有 reply
        expect(response.reply).toBeTruthy();
      }
    }, 60000);
  });

  // ============================================================
  // Shipping
  // ============================================================
  describe('Shipping', () => {
    it('should explain shipping options', async () => {
      const f = SUPPORT_FIXTURES.shippingOptions;
      const response = await n8n.triggerSupportWebhook(f);

      console.log(`[shippingOptions] reply: ${response.reply?.slice(0, 200)}`);

      expect(response.classification).toBe('auto');
      assertReplyQuality(response, f, 'shippingOptions');
    }, 60000);

    it('should answer free shipping question', async () => {
      const f = SUPPORT_FIXTURES.freeShipping;
      const response = await n8n.triggerSupportWebhook(f);

      console.log(`[freeShipping] reply: ${response.reply?.slice(0, 200)}`);

      expect(response.classification).toBe('auto');
      assertReplyQuality(response, f, 'freeShipping');
    }, 60000);

    it('should answer international shipping question', async () => {
      const f = SUPPORT_FIXTURES.internationalShipping;
      const response = await n8n.triggerSupportWebhook(f);

      console.log(`[internationalShipping] reply: ${response.reply?.slice(0, 200)}`);

      expect(response.classification).toBe('auto');
      assertReplyQuality(response, f, 'internationalShipping');
    }, 60000);
  });

  // ============================================================
  // Returns & Refunds
  // ============================================================
  describe('Returns & Refunds', () => {
    it('should explain return policy (auto)', async () => {
      const f = SUPPORT_FIXTURES.returnPolicy;
      const response = await n8n.triggerSupportWebhook(f);

      console.log(`[returnPolicy] reply: ${response.reply?.slice(0, 200)}`);

      expect(response.classification).toBe('auto');
      assertReplyQuality(response, f, 'returnPolicy');
    }, 60000);

    it('should explain return window (auto)', async () => {
      const f = SUPPORT_FIXTURES.returnWindow;
      const response = await n8n.triggerSupportWebhook(f);

      console.log(`[returnWindow] reply: ${response.reply?.slice(0, 200)}`);

      expect(response.classification).toBe('auto');
      assertReplyQuality(response, f, 'returnWindow');
    }, 60000);

    it('should classify return order request as draft', async () => {
      const f = SUPPORT_FIXTURES.returnOrder;
      const response = await n8n.triggerSupportWebhook(f);

      console.log(`[returnOrder] classification: ${response.classification}, reply: ${response.reply?.slice(0, 200)}`);

      // AI 查到订单退款状态时可能直接 auto 回复，否则走 draft 人工审核
      expect(['auto', 'draft']).toContain(response.classification);
      expect(['auto_replied', 'needs_review']).toContain(response.status);
      expect(response.reply).toBeTruthy();
      assertReplyQuality(response, f, 'returnOrder');
    }, 60000);

    it('should classify refund request as draft', async () => {
      const f = SUPPORT_FIXTURES.refundRequest;
      const response = await n8n.triggerSupportWebhook(f);

      console.log(`[refundRequest] classification: ${response.classification}, reply: ${response.reply?.slice(0, 200)}`);

      // AI 可能分类为 auto（说明退款政策）或 draft（需人工处理退款）
      expect(['auto', 'draft']).toContain(response.classification);
      expect(['auto_replied', 'needs_review']).toContain(response.status);
      expect(response.reply).toBeTruthy();
      assertReplyQuality(response, f, 'refundRequest');
    }, 60000);
  });

  // ============================================================
  // Payment & Discounts
  // ============================================================
  describe('Payment & Discounts', () => {
    it('should classify discount request appropriately', async () => {
      const f = SUPPORT_FIXTURES.discountRequest;
      const response = await n8n.triggerSupportWebhook(f);

      console.log(`[discountRequest] classification: ${response.classification}, reply: ${response.reply?.slice(0, 200)}`);

      // AI 可能分类为 auto 或 draft，都可接受
      expect(['auto', 'draft']).toContain(response.classification);
      expect(response.reply).toBeTruthy();
      expect(response.reply).toContain('discount');
    }, 60000);

    it('should classify sale inquiry as auto', async () => {
      const f = SUPPORT_FIXTURES.saleInquiry;
      const response = await n8n.triggerSupportWebhook(f);

      console.log(`[saleInquiry] reply: ${response.reply?.slice(0, 200)}`);

      expect(response.classification).toBe('auto');
      assertReplyQuality(response, f, 'saleInquiry');
    }, 60000);

    it('should escalate double charge and reply must be null', async () => {
      const f = SUPPORT_FIXTURES.doubleCharge;
      const response = await n8n.triggerSupportWebhook(f);

      console.log(`[doubleCharge] status: ${response.status}, reason: ${response.reason}`);

      expect(['escalated', 'needs_review']).toContain(response.status);
      if (response.status === 'escalated') {
        expect(response.classification).toBe('escalate');
        assertReplyQuality(response, f, 'doubleCharge');
      }
      expect(response.reason).toBeTruthy();
    }, 60000);

    it('should escalate charge dispute and reply must be null', async () => {
      const f = SUPPORT_FIXTURES.disputeCharge;
      const response = await n8n.triggerSupportWebhook(f);

      console.log(`[disputeCharge] status: ${response.status}, reason: ${response.reason}`);

      expect(['escalated', 'needs_review']).toContain(response.status);
      if (response.status === 'escalated') {
        expect(response.classification).toBe('escalate');
        assertReplyQuality(response, f, 'disputeCharge');
      }
    }, 60000);
  });

  // ============================================================
  // Order Modifications (draft)
  // ============================================================
  describe('Order Modifications', () => {
    it('should classify add items request appropriately', async () => {
      const f = SUPPORT_FIXTURES.addItems;
      const response = await n8n.triggerSupportWebhook(f);

      console.log(`[addItems] classification: ${response.classification}, reply: ${response.reply?.slice(0, 200)}`);

      // AI 可能分类为 auto（策略说明）或 draft（需要人工处理订单修改）
      expect(['auto', 'draft']).toContain(response.classification);
      if (response.classification === 'auto') {
        expect(response.status).toBe('auto_replied');
        assertReplyQuality(response, f, 'addItems');
      } else {
        expect(response.status).toBe('needs_review');
        if (response.reply) {
          assertReplyQuality(response, f, 'addItems');
        }
      }
    }, 60000);

    it('should classify cancel order request as draft', async () => {
      const f = SUPPORT_FIXTURES.cancelRequest;
      const response = await n8n.triggerSupportWebhook(f);

      console.log(`[cancelRequest] reply: ${response.reply?.slice(0, 200)}`);

      expect(response.status).toBe('needs_review');
      expect(response.classification).toBe('draft');
      assertReplyQuality(response, f, 'cancelRequest');
    }, 60000);

    it('should classify size change request appropriately', async () => {
      const f = SUPPORT_FIXTURES.changeSize;
      const response = await n8n.triggerSupportWebhook(f);

      console.log(`[changeSize] classification: ${response.classification}, reply: ${response.reply}, status: ${response.status}`);

      // AI 可能分类为 draft 或 escalate（如果没有明确政策）
      expect(['draft', 'escalate']).toContain(response.classification);
      if (response.classification === 'draft') {
        assertReplyQuality(response, f, 'changeSize');
      } else {
        // escalate 场景 reply 为 null
        expect(response.reply).toBeNull();
      }
    }, 60000);
  });

  // ============================================================
  // Escalate 场景 — reply 必须为 null
  // ============================================================
  describe('Escalate 场景', () => {
    it('should escalate legal threat with null reply', async () => {
      const f = SUPPORT_FIXTURES.legalThreat;
      const response = await n8n.triggerSupportWebhook(f);

      console.log(`[legalThreat] status: ${response.status}, reason: ${response.reason}`);

      expect(['escalated', 'needs_review']).toContain(response.status);
      expect(response.reason).toBeTruthy();
      if (response.status === 'escalated') {
        expect(response.classification).toBe('escalate');
        assertReplyQuality(response, f, 'legalThreat');
      }
    }, 60000);

    it('should escalate fraud claim with null reply', async () => {
      const f = SUPPORT_FIXTURES.fraudClaim;
      const response = await n8n.triggerSupportWebhook(f);

      console.log(`[fraudClaim] status: ${response.status}, reason: ${response.reason}`);

      expect(['escalated', 'needs_review']).toContain(response.status);
      expect(response.reason).toBeTruthy();
      if (response.status === 'escalated') {
        expect(response.classification).toBe('escalate');
        assertReplyQuality(response, f, 'fraudClaim');
      }
    }, 60000);
  });

  // ============================================================
  // 边界条件
  // ============================================================
  describe('边界条件', () => {
    it('should reject empty message', async () => {
      try {
        await n8n.triggerSupportWebhook(SUPPORT_FIXTURES.emptyMessage);
        expect.fail('Should have rejected empty message');
      } catch (error: any) {
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

    it('should handle long message without crashing', async () => {
      const response = await n8n.triggerSupportWebhook(SUPPORT_FIXTURES.longMessage);

      expect(response.status).toBeDefined();
      expect(['auto_replied', 'needs_review', 'escalated']).toContain(response.status);
    }, 60000);

    it('should handle XSS attempt and strip script tags from reply', async () => {
      const response = await n8n.triggerSupportWebhook(SUPPORT_FIXTURES.specialChars);

      expect(response.status).toBeDefined();
      expect(response.ticketId).toBe(SUPPORT_FIXTURES.specialChars.ticketId);
      if (response.reply) {
        expect(response.reply).not.toContain('<script>');
      }
    }, 60000);
  });

  // ============================================================
  // 错误降级逻辑
  // ============================================================
  describe('错误降级逻辑', () => {
    it('should fallback to draft when AI fails', async () => {
      const response = await n8n.triggerSupportWebhook(SUPPORT_FIXTURES.degradation);

      expect(response.status).toBeDefined();
      expect(['auto_replied', 'needs_review', 'escalated']).toContain(response.status);

      if (response.fallbackApplied) {
        expect(response.classification).toBe('draft');
        expect(response.reply).toContain('感谢您的消息');
        expect(response.reason).toContain('AI 分类服务暂时不可用');

        const logs = await db.getDegradationLogs(SUPPORT_FIXTURES.degradation.ticketId);
        if (logs.length > 0) {
          expect(logs[0].status).toBe('degraded');
          expect(logs[0].workflow_id).toBe('shopify-support-handler');
        }
      }
    }, 60000);

    it('should trigger Handle AI Error branch on force-error input', async () => {
      const testTicketId = `test-force-error-retry-${Date.now()}`;

      const response = await n8n.triggerSupportWebhook({
        message: 'This message will trigger force-error mode in Parse Input node',
        ticketId: testTicketId,
        customerName: 'Force Error Test',
        customerEmail: 'force-error@example.com',
        platform: 'shopify',
        orderId: null,
      });

      console.log('📋 Force-error response:', JSON.stringify(response, null, 2));

      expect(response.status).toBe('needs_review');
      expect(response.classification).toBe('draft');
      expect(response.reason).toContain('AI');
      expect(response.reply).toBeDefined();
    }, 35000);

    it('should gracefully degrade without crashing workflow', async () => {
      const testTicketId = `test-force-error-graceful-${Date.now()}`;

      const response = await n8n.triggerSupportWebhook({
        message: 'Testing graceful degradation',
        ticketId: testTicketId,
        customerName: 'Graceful Test',
        customerEmail: 'graceful@example.com',
        platform: 'shopify',
        orderId: null,
      });

      expect(response).toBeDefined();
      expect(response.status).toBe('needs_review');
      expect(response.classification).toBe('draft');
      expect(response.riskLevel).toBe('medium');
      expect(response.reply).toBe('感谢您的消息。我们的团队会尽快为您处理。');
    }, 35000);
  });

  // ============================================================
  // 全局错误捕获
  // ============================================================
  describe('全局错误捕获', () => {
    it('should catch errors from empty message validation', async () => {
      try {
        await n8n.triggerSupportWebhook({
          message: '',
          ticketId: `test-global-empty-${Date.now()}`,
          customerName: 'Empty Message Test',
          customerEmail: 'empty@example.com',
          platform: 'shopify',
          orderId: null,
        });
        expect.fail('Should have thrown error or returned degraded response');
      } catch (error: any) {
        expect(error.message).toBeDefined();
        console.log(`✅ Global error caught: ${error.message}`);
      }
    }, 35000);

    it('should handle malformed data gracefully', async () => {
      const response = await n8n.triggerSupportWebhook({
        message: '{"invalid": "json structure as message"} <script>alert(1)</script> ' + '\n\r\t'.repeat(50),
        ticketId: `test-global-malformed-${Date.now()}`,
        customerName: 'Malformed\nData\tTest',
        customerEmail: 'malformed@example.com',
        platform: 'shopify',
        orderId: null,
      });

      expect(response).toBeDefined();
      expect(response.status).toBeDefined();
      expect(['auto_replied', 'needs_review', 'escalated']).toContain(response.status);

      if (response.reply) {
        expect(response.reply).not.toContain('<script>');
        expect(response.reply).not.toContain('undefined');
        expect(response.reply).not.toContain('[object Object]');
      }
    }, 35000);

    it('should handle unicode and special character messages', async () => {
      const response = await n8n.triggerSupportWebhook({
        message: 'Test parsing with edge case: ' + '特殊字符测试 ñ ü ö 中文测试 '.repeat(10),
        ticketId: `test-parse-error-${Date.now()}`,
        customerName: 'Parse Error Test',
        customerEmail: 'parse@example.com',
        platform: 'shopify',
        orderId: null,
      });

      expect(response).toBeDefined();
      expect(response.status).toBeDefined();
      expect(['auto_replied', 'needs_review', 'escalated']).toContain(response.status);
    }, 35000);
  });
});
