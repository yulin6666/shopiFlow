import { describe, it, expect } from 'vitest';
import {
  parseInputLogic,
  parseClassificationLogic,
  handleAiErrorLogic,
} from '../helpers/fixtures';

describe('n8n workflow logic - Parse Input', () => {
  it('should parse valid input', () => {
    const body = {
      message: 'Where is my order?',
      ticketId: 'test-001',
      customerName: 'John Doe',
      customerEmail: 'john@example.com',
      platform: 'shopify',
      orderId: '1234',
    };

    const result = parseInputLogic(body);

    expect(result.ticketId).toBe('test-001');
    expect(result.customerName).toBe('John Doe');
    expect(result.customerEmail).toBe('john@example.com');
    expect(result.platform).toBe('shopify');
    expect(result.orderId).toBe('1234');
    expect(result.chatInput).toContain('Platform: shopify');
    expect(result.chatInput).toContain('Message: Where is my order?');
    expect(result.chatInput).toContain('Order ID: 1234');
  });

  it('should throw error for empty message', () => {
    const body = {
      message: '',
      ticketId: 'test-002',
    };

    expect(() => parseInputLogic(body)).toThrow('Invalid input: message is required');
  });

  it('should throw error for whitespace-only message', () => {
    const body = {
      message: '   ',
      ticketId: 'test-003',
    };

    expect(() => parseInputLogic(body)).toThrow('Invalid input: message is required');
  });

  it('should use defaults for missing fields', () => {
    const body = {
      message: 'Hello',
    };

    const result = parseInputLogic(body);

    expect(result.customerName).toBe('Customer');
    expect(result.customerEmail).toBe('');
    expect(result.platform).toBe('shopify');
    expect(result.orderId).toBeNull();
    expect(result.ticketId).toBeDefined();
  });

  it('should handle null orderId', () => {
    const body = {
      message: 'Hello',
      orderId: null,
    };

    const result = parseInputLogic(body);
    expect(result.chatInput).toContain('Order ID: None');
  });
});

describe('n8n workflow logic - Parse Classification', () => {
  const mockTicket = {
    ticketId: 'test-001',
    customerName: 'John Doe',
    customerEmail: 'john@example.com',
    platform: 'shopify',
    chatInput: 'Platform: shopify\nMessage: Where is my order?\nOrder ID: None',
  };

  it('should parse valid auto classification', () => {
    const agentOutput = JSON.stringify({
      classification: 'auto',
      reason: null,
      risk_level: 'low',
      reply: 'Your order is on the way!',
    });

    const result = parseClassificationLogic(agentOutput, mockTicket);

    expect(result.status).toBe('auto_replied');
    expect(result.classification).toBe('auto');
    expect(result.reply).toBe('Your order is on the way!');
    expect(result.ticketId).toBe('test-001');
  });

  it('should parse valid draft classification', () => {
    const agentOutput = JSON.stringify({
      classification: 'draft',
      reason: 'Refund request needs approval',
      risk_level: 'medium',
      reply: 'We will process your refund shortly.',
    });

    const result = parseClassificationLogic(agentOutput, mockTicket);

    expect(result.status).toBe('needs_review');
    expect(result.classification).toBe('draft');
    expect(result.reason).toBe('Refund request needs approval');
  });

  it('should parse valid escalate classification', () => {
    const agentOutput = JSON.stringify({
      classification: 'escalate',
      reason: 'Legal threat detected',
      risk_level: 'high',
      reply: null,
    });

    const result = parseClassificationLogic(agentOutput, mockTicket);

    expect(result.status).toBe('escalated');
    expect(result.classification).toBe('escalate');
    expect(result.reason).toBe('Legal threat detected');
    expect(result.reply).toBeNull();
  });

  it('should handle JSON wrapped in code blocks', () => {
    const agentOutput = '```json\n{"classification": "auto", "reply": "Hello"}\n```';

    const result = parseClassificationLogic(agentOutput, mockTicket);

    expect(result.classification).toBe('auto');
    expect(result.reply).toBe('Hello');
  });

  it('should escalate on parse error', () => {
    const agentOutput = 'This is not valid JSON';

    const result = parseClassificationLogic(agentOutput, mockTicket);

    expect(result.status).toBe('escalated');
    expect(result.classification).toBe('escalate');
    expect(result.reason).toBe('AI output parse error');
    expect(result.riskLevel).toBe('high');
  });

  it('should escalate on invalid classification', () => {
    const agentOutput = JSON.stringify({
      classification: 'invalid_type',
      reply: 'Test',
    });

    const result = parseClassificationLogic(agentOutput, mockTicket);

    expect(result.classification).toBe('escalate');
    expect(result.reason).toContain('Invalid classification');
  });

  it('should preserve ticket metadata', () => {
    const agentOutput = JSON.stringify({
      classification: 'auto',
      reply: 'Test',
    });

    const result = parseClassificationLogic(agentOutput, mockTicket);

    expect(result.ticketId).toBe(mockTicket.ticketId);
    expect(result.customerName).toBe(mockTicket.customerName);
    expect(result.customerEmail).toBe(mockTicket.customerEmail);
    expect(result.platform).toBe(mockTicket.platform);
    expect(result.originalMessage).toBe(mockTicket.chatInput);
  });
});

describe('n8n workflow logic - Handle AI Error', () => {
  const mockTicket = {
    ticketId: 'test-error-001',
    customerName: 'Test User',
    customerEmail: 'test@example.com',
    platform: 'shopify',
    chatInput: 'Platform: shopify\nMessage: Test\nOrder ID: None',
  };

  it('should create fallback draft response', () => {
    const error = { message: 'OpenRouter API timeout' };

    const result = handleAiErrorLogic(mockTicket, error);

    expect(result.status).toBe('needs_review');
    expect(result.classification).toBe('draft');
    expect(result.riskLevel).toBe('medium');
    expect(result.reply).toContain('感谢您的消息');
    expect(result.fallbackApplied).toBe(true);
  });

  it('should include error details in reason', () => {
    const error = { message: 'Connection refused' };

    const result = handleAiErrorLogic(mockTicket, error);

    expect(result.reason).toContain('Connection refused');
    expect(result.reason).toContain('AI 分类服务暂时不可用');
  });

  it('should preserve ticket metadata', () => {
    const error = { message: 'Test error' };

    const result = handleAiErrorLogic(mockTicket, error);

    expect(result.ticketId).toBe(mockTicket.ticketId);
    expect(result.customerName).toBe(mockTicket.customerName);
    expect(result.customerEmail).toBe(mockTicket.customerEmail);
    expect(result.platform).toBe(mockTicket.platform);
    expect(result.originalMessage).toBe(mockTicket.chatInput);
  });

  it('should handle unknown error', () => {
    const error = {};

    const result = handleAiErrorLogic(mockTicket, error);

    expect(result.reason).toContain('Unknown error');
    expect(result.fallbackApplied).toBe(true);
  });

  it('should serialize error details', () => {
    const error = { message: 'Test', code: 500, details: { foo: 'bar' } };

    const result = handleAiErrorLogic(mockTicket, error);

    expect(result.errorDetails).toBeDefined();
    expect(JSON.parse(result.errorDetails)).toEqual(error);
  });
});
