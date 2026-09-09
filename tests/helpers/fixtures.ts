/**
 * 测试数据固定集
 * 覆盖正常路径 + 边界条件 + 错误场景
 */

// ---- Support Handler 测试 Fixtures ----

export const SUPPORT_FIXTURES = {
  // 正常 auto 分类场景
  orderQuery: {
    message: 'Where is my order? Order number is #1180.',
    ticketId: 'test-auto-order-001',
    customerName: 'Test User',
    customerEmail: 'test@example.com',
    platform: 'shopify',
    orderId: '1180',
  },
  productQuery: {
    message: 'Do you have any NIKE products in stock?',
    ticketId: 'test-auto-product-001',
    customerName: 'Test User',
    customerEmail: 'test@example.com',
    platform: 'shopify',
    orderId: null,
  },

  // draft 分类场景（含敏感关键词）
  refundRequest: {
    message: 'I want to request a refund for my order. The product was damaged.',
    ticketId: 'test-draft-refund-001',
    customerName: 'Test User',
    customerEmail: 'test@example.com',
    platform: 'shopify',
    orderId: null,
  },
  cancelRequest: {
    message: 'I need to cancel my order immediately.',
    ticketId: 'test-draft-cancel-001',
    customerName: 'Test User',
    customerEmail: 'test@example.com',
    platform: 'shopify',
    orderId: null,
  },

  // escalate 分类场景（高风险关键词）
  legalThreat: {
    message: 'I will sue your company if this is not resolved. My lawyer is involved.',
    ticketId: 'test-escalate-legal-001',
    customerName: 'Test User',
    customerEmail: 'test@example.com',
    platform: 'shopify',
    orderId: null,
  },
  fraudClaim: {
    message: 'This is fraud! I will file a chargeback and dispute with my bank.',
    ticketId: 'test-escalate-fraud-001',
    customerName: 'Test User',
    customerEmail: 'test@example.com',
    platform: 'shopify',
    orderId: null,
  },

  // 降级兜底场景（AI 不可用时）
  degradation: {
    message: 'What is your return policy?',
    ticketId: 'test-degraded-001',
    customerName: 'Degradation Test User',
    customerEmail: 'degraded@example.com',
    platform: 'shopify',
    orderId: null,
  },

  // 边界条件
  emptyMessage: {
    message: '',
    ticketId: 'test-edge-empty-001',
    customerName: 'Edge User',
    customerEmail: 'edge@example.com',
    platform: 'shopify',
    orderId: null,
  },
  whitespaceMessage: {
    message: '   ',
    ticketId: 'test-edge-whitespace-001',
    customerName: 'Edge User',
    customerEmail: 'edge@example.com',
    platform: 'shopify',
    orderId: null,
  },
  longMessage: {
    message: 'A'.repeat(2000),
    ticketId: 'test-edge-long-001',
    customerName: 'Edge User',
    customerEmail: 'edge@example.com',
    platform: 'shopify',
    orderId: null,
  },
  specialChars: {
    message: '<script>alert("xss")</script> Hello, I have a question about my order.',
    ticketId: 'test-edge-xss-001',
    customerName: 'Edge User',
    customerEmail: 'edge@example.com',
    platform: 'shopify',
    orderId: null,
  },

  // 模拟节点重试场景（超长消息可能导致 OpenRouter 处理缓慢或超时）
  veryLongMessage: {
    message: 'I have a very detailed and complex question about my order. '.repeat(200), // ~12000 chars
    ticketId: 'test-retry-verylong-001',
    customerName: 'Retry Test User',
    customerEmail: 'retry@example.com',
    platform: 'shopify',
    orderId: '1180',
  },

  // 模拟可能触发错误的畸形数据
  malformedData: {
    message: '{"invalid": "json"} <script>alert(1)</script> ' + '\n\r\t'.repeat(50) + ' 特殊字符 ñ ü ö 中文',
    ticketId: 'test-malformed-001',
    customerName: 'Malformed\nTest',
    customerEmail: 'malformed@example.com',
    platform: 'shopify',
    orderId: null,
  },
};

// ---- Review Handler 测试 Fixtures ----

export const REVIEW_FIXTURES = {
  positiveReview: {
    reviewId: 'test-rev-positive-001',
    rating: 5,
    title: 'Amazing product!',
    body: 'I love this product. It has changed my life for the better.',
    productTitle: 'Daily Wellness Bundle',
    reviewerName: 'Happy Customer',
    platform: 'shopify',
  },
  negativeReview: {
    reviewId: 'test-rev-negative-001',
    rating: 1,
    title: 'Terrible experience',
    body: 'Product arrived damaged and customer service was unhelpful.',
    productTitle: 'Omega-3 Fish Oil 1000mg',
    reviewerName: 'Unhappy Customer',
    platform: 'amazon',
  },
  neutralReview: {
    reviewId: 'test-rev-neutral-001',
    rating: 3,
    title: 'Average product',
    body: 'Nothing special but does what it says.',
    productTitle: 'Collagen Glow Complex',
    reviewerName: 'Neutral Customer',
    platform: 'tiktok',
  },
};

// ---- n8n Parse Input 节点逻辑（提取自 workflow Code 节点，用于单元测试）----

export function parseInputLogic(body: Record<string, any>): Record<string, any> {
  const message = body.message || '';
  const ticketId = body.ticketId || Date.now();
  const customerName = body.customerName || 'Customer';
  const customerEmail = body.customerEmail || '';
  const platform = body.platform || 'shopify';
  const orderId = body.orderId || null;

  if (!message || message.trim().length === 0) {
    throw new Error(`Invalid input: message is required. Received ticketId=${ticketId}`);
  }

  return {
    ticketId,
    customerName,
    customerEmail,
    platform,
    orderId,
    chatInput: `Platform: ${platform}\nMessage: ${message}\nOrder ID: ${orderId || 'None'}`,
  };
}

// ---- n8n Parse Classification 节点逻辑（提取自 workflow Code 节点，用于单元测试）----

export function parseClassificationLogic(
  agentOutput: string,
  ticket: Record<string, any>,
): Record<string, any> {
  let parsed: Record<string, any>;
  try {
    const cleaned = agentOutput
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(match ? match[0] : cleaned);
  } catch {
    parsed = {
      classification: 'escalate',
      reason: 'AI output parse error',
      risk_level: 'high',
      reply: null,
    };
  }

  const classification = parsed.classification || 'escalate';

  if (!['auto', 'draft', 'escalate'].includes(classification)) {
    parsed.classification = 'escalate';
    parsed.reason = `Invalid classification: ${classification}`;
  }

  let status: string;
  if (parsed.classification === 'auto') status = 'auto_replied';
  else if (parsed.classification === 'draft') status = 'needs_review';
  else status = 'escalated';

  return {
    status,
    classification: parsed.classification,
    reason: parsed.reason || '',
    riskLevel: parsed.risk_level || 'high',
    reply: parsed.reply || null,
    ticketId: ticket.ticketId,
    customerName: ticket.customerName,
    customerEmail: ticket.customerEmail,
    platform: ticket.platform,
    originalMessage: ticket.chatInput,
  };
}

// ---- n8n Handle AI Error 节点逻辑（提取自 workflow Code 节点，用于单元测试）----

export function handleAiErrorLogic(
  ticket: Record<string, any>,
  error: Record<string, any>,
): Record<string, any> {
  return {
    status: 'needs_review',
    classification: 'draft',
    reason: `AI 分类服务暂时不可用，已标记为待审核: ${error.message || 'Unknown error'}`,
    riskLevel: 'medium',
    reply: '感谢您的消息。我们的团队会尽快为您处理。',
    ticketId: ticket.ticketId,
    customerName: ticket.customerName,
    customerEmail: ticket.customerEmail,
    platform: ticket.platform,
    originalMessage: ticket.chatInput,
    errorDetails: JSON.stringify(error),
    fallbackApplied: true,
  };
}
