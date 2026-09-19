/**
 * 测试数据固定集
 * 覆盖正常路径 + 边界条件 + 错误场景
 */

// ---- Support Handler 测试 Fixtures ----

export const SUPPORT_FIXTURES = {
  // ===== Product Inquiries (应分类为 auto，必须调用知识库) =====
  listAdidasProducts: {
    message: 'List all ADIDAS products',
    ticketId: 'test-auto-adidas-list-001',
    customerName: 'Test User',
    customerEmail: 'test@example.com',
    platform: 'shopify',
    orderId: null,
    expectedClassification: 'auto',
    // 验证：reply 必须包含 ADIDAS 产品信息或明确说明未找到
    replyMustContain: ['ADIDAS', 'product'],
  },
  adidasBackpacks: {
    message: 'Do you have any ADIDAS backpacks?',
    ticketId: 'test-auto-adidas-backpack-001',
    customerName: 'Test User',
    customerEmail: 'test@example.com',
    platform: 'shopify',
    orderId: null,
    expectedClassification: 'auto',
    replyMustContain: ['backpack'],
  },
  nikeRosheStock: {
    message: 'Is the NIKE TODDLER ROSHE ONE in stock?',
    ticketId: 'test-auto-nike-stock-001',
    customerName: 'Test User',
    customerEmail: 'test@example.com',
    platform: 'shopify',
    orderId: null,
    expectedClassification: 'auto',
    replyMustContain: ['stock', 'NIKE'],
  },
  adidasBackpackPrice: {
    message: 'How much does the ADIDAS CLASSIC BACKPACK cost?',
    ticketId: 'test-auto-adidas-price-001',
    customerName: 'Test User',
    customerEmail: 'test@example.com',
    platform: 'shopify',
    orderId: null,
    expectedClassification: 'auto',
    replyMustContain: ['price', 'ADIDAS CLASSIC BACKPACK'],
  },
  adidasBackpackInfo: {
    message: 'Tell me more about the ADIDAS CLASSIC BACKPACK',
    ticketId: 'test-auto-adidas-info-001',
    customerName: 'Test User',
    customerEmail: 'test@example.com',
    platform: 'shopify',
    orderId: null,
    expectedClassification: 'auto',
    replyMustContain: ['ADIDAS CLASSIC BACKPACK'],
  },

  // ===== Order Status & Tracking (应分类为 auto) =====
  orderStatus: {
    message: "What's the status of order #1180?",
    ticketId: 'test-auto-order-status-001',
    customerName: 'Test User',
    customerEmail: 'test@example.com',
    platform: 'shopify',
    orderId: '1180',
    expectedClassification: 'auto',
    replyMustContain: ['order', '1180'],
  },
  orderLocation: {
    message: 'Where is my order?',
    ticketId: 'test-auto-order-location-001',
    customerName: 'Test User',
    customerEmail: 'test@example.com',
    platform: 'shopify',
    orderId: null,
    expectedClassification: 'auto',
    replyMustContain: ['order'],
  },
  trackingNumber: {
    message: "What's the tracking number for order #1180?",
    ticketId: 'test-auto-tracking-001',
    customerName: 'Test User',
    customerEmail: 'test@example.com',
    platform: 'shopify',
    orderId: '1180',
    expectedClassification: 'auto',
    replyMustContain: ['tracking', '1180'],
  },
  orderDetails: {
    message: 'Show me details of order 1180',
    ticketId: 'test-auto-order-details-001',
    customerName: 'Test User',
    customerEmail: 'test@example.com',
    platform: 'shopify',
    orderId: '1180',
    expectedClassification: 'auto',
    replyMustContain: ['order', '1180'],
  },

  // ===== Shipping (应分类为 auto) =====
  shippingOptions: {
    message: 'What are your shipping options?',
    ticketId: 'test-auto-shipping-001',
    customerName: 'Test User',
    customerEmail: 'test@example.com',
    platform: 'shopify',
    orderId: null,
    expectedClassification: 'auto',
    replyMustContain: ['shipping'],
  },
  freeShipping: {
    message: 'Do you offer free shipping?',
    ticketId: 'test-auto-free-shipping-001',
    customerName: 'Test User',
    customerEmail: 'test@example.com',
    platform: 'shopify',
    orderId: null,
    expectedClassification: 'auto',
    replyMustContain: ['shipping'],
  },
  internationalShipping: {
    message: 'Do you ship internationally?',
    ticketId: 'test-auto-intl-shipping-001',
    customerName: 'Test User',
    customerEmail: 'test@example.com',
    platform: 'shopify',
    orderId: null,
    expectedClassification: 'auto',
    replyMustContain: ['international', 'ship'],
  },

  // ===== Returns & Refunds (应分类为 draft) =====
  returnPolicy: {
    message: "What's your return policy?",
    ticketId: 'test-auto-return-policy-001',
    customerName: 'Test User',
    customerEmail: 'test@example.com',
    platform: 'shopify',
    orderId: null,
    expectedClassification: 'auto',
    replyMustContain: ['return', 'policy'],
  },
  returnWindow: {
    message: 'How long do I have to return an item?',
    ticketId: 'test-auto-return-window-001',
    customerName: 'Test User',
    customerEmail: 'test@example.com',
    platform: 'shopify',
    orderId: null,
    expectedClassification: 'auto',
    replyMustContain: ['return'],
  },
  returnOrder: {
    message: 'I want to return order #1180',
    ticketId: 'test-draft-return-order-001',
    customerName: 'Test User',
    customerEmail: 'test@example.com',
    platform: 'shopify',
    orderId: '1180',
    expectedClassification: 'draft',
    // AI 可能回复 return 流程，也可能直接说明订单 refund 状态
    replyMustContain: ['return', 'refund'],
  },
  refundRequest: {
    message: 'Can I get a refund for my order?',
    ticketId: 'test-draft-refund-001',
    customerName: 'Test User',
    customerEmail: 'test@example.com',
    platform: 'shopify',
    orderId: null,
    expectedClassification: 'draft',
    replyMustContain: ['refund'],
  },

  // ===== Payment & Discounts =====
  discountRequest: {
    message: 'Do you have any discount codes?',
    ticketId: 'test-draft-discount-001',
    customerName: 'Test User',
    customerEmail: 'test@example.com',
    platform: 'shopify',
    orderId: null,
    expectedClassification: 'draft',
    replyMustContain: ['discount'],
  },
  saleInquiry: {
    message: 'Is there a sale going on?',
    ticketId: 'test-auto-sale-001',
    customerName: 'Test User',
    customerEmail: 'test@example.com',
    platform: 'shopify',
    orderId: null,
    expectedClassification: 'auto',
  },
  doubleCharge: {
    message: 'My payment was charged twice',
    ticketId: 'test-escalate-double-charge-001',
    customerName: 'Test User',
    customerEmail: 'test@example.com',
    platform: 'shopify',
    orderId: null,
    expectedClassification: 'escalate',
    replyMustBeNull: true,
  },
  disputeCharge: {
    message: 'I want to dispute this charge',
    ticketId: 'test-escalate-dispute-001',
    customerName: 'Test User',
    customerEmail: 'test@example.com',
    platform: 'shopify',
    orderId: null,
    expectedClassification: 'escalate',
    replyMustBeNull: true,
  },

  // ===== Order Modifications (应分类为 draft) =====
  addItems: {
    message: 'Can I add more items to my order?',
    ticketId: 'test-draft-add-items-001',
    customerName: 'Test User',
    customerEmail: 'test@example.com',
    platform: 'shopify',
    orderId: null,
    expectedClassification: 'draft',
    replyMustContain: ['order'],
  },
  cancelRequest: {
    message: 'I want to cancel order #1180',
    ticketId: 'test-draft-cancel-001',
    customerName: 'Test User',
    customerEmail: 'test@example.com',
    platform: 'shopify',
    orderId: '1180',
    expectedClassification: 'draft',
    replyMustContain: ['cancel'],
  },
  changeSize: {
    message: 'Can I change the size I ordered?',
    ticketId: 'test-draft-change-size-001',
    customerName: 'Test User',
    customerEmail: 'test@example.com',
    platform: 'shopify',
    orderId: null,
    expectedClassification: 'draft',
    replyMustContain: ['order'],
  },

  // ===== Escalate 场景 =====
  legalThreat: {
    message: 'I will sue your company if this is not resolved. My lawyer is involved.',
    ticketId: 'test-escalate-legal-001',
    customerName: 'Test User',
    customerEmail: 'test@example.com',
    platform: 'shopify',
    orderId: null,
    expectedClassification: 'escalate',
    replyMustBeNull: true,
  },
  fraudClaim: {
    message: 'This is fraud! I will file a chargeback and dispute with my bank.',
    ticketId: 'test-escalate-fraud-001',
    customerName: 'Test User',
    customerEmail: 'test@example.com',
    platform: 'shopify',
    orderId: null,
    expectedClassification: 'escalate',
    replyMustBeNull: true,
  },

  // ===== 降级兜底场景 =====
  degradation: {
    message: "What is your return policy?",
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
