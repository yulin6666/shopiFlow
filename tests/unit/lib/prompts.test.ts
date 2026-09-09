import { describe, it, expect } from 'vitest';
import {
  SUPPORT_SYSTEM_PROMPT,
  SUPPORT_ESCALATION_MESSAGES,
  buildReviewReplyPrompt,
  WORKFLOW_DESCRIPTIONS,
} from '@/lib/prompts';

describe('lib/prompts', () => {
  describe('SUPPORT_SYSTEM_PROMPT', () => {
    it('should contain classification categories', () => {
      expect(SUPPORT_SYSTEM_PROMPT).toContain('AUTO');
      expect(SUPPORT_SYSTEM_PROMPT).toContain('DRAFT');
      expect(SUPPORT_SYSTEM_PROMPT).toContain('ESCALATE');
    });

    it('should contain JSON response format', () => {
      expect(SUPPORT_SYSTEM_PROMPT).toContain('JSON format');
      expect(SUPPORT_SYSTEM_PROMPT).toContain('escalation');
      expect(SUPPORT_SYSTEM_PROMPT).toContain('reply');
    });

    it('should contain escalation rules', () => {
      expect(SUPPORT_SYSTEM_PROMPT).toContain('health reactions');
      expect(SUPPORT_SYSTEM_PROMPT).toContain('chargeback');
      expect(SUPPORT_SYSTEM_PROMPT).toContain('legal');
    });

    it('should contain draft rules', () => {
      expect(SUPPORT_SYSTEM_PROMPT).toContain('Refund');
      expect(SUPPORT_SYSTEM_PROMPT).toContain('return requests');
    });
  });

  describe('SUPPORT_ESCALATION_MESSAGES', () => {
    it('should have messages for all escalation levels', () => {
      expect(SUPPORT_ESCALATION_MESSAGES.auto).toBeDefined();
      expect(SUPPORT_ESCALATION_MESSAGES.draft).toBeDefined();
      expect(SUPPORT_ESCALATION_MESSAGES.escalated).toBeDefined();
    });

    it('should have descriptive messages', () => {
      expect(SUPPORT_ESCALATION_MESSAGES.auto).toContain('automatically');
      expect(SUPPORT_ESCALATION_MESSAGES.draft).toContain('approval');
      expect(SUPPORT_ESCALATION_MESSAGES.escalated).toContain('human agent');
    });
  });

  describe('buildReviewReplyPrompt', () => {
    it('should build prompt for 5-star review', () => {
      const prompt = buildReviewReplyPrompt(
        'shopify',
        5,
        'Amazing product!',
        'Daily Wellness Bundle',
        'en',
      );

      expect(prompt).toContain('shopify');
      expect(prompt).toContain('5/5');
      expect(prompt).toContain('warm and grateful');
      expect(prompt).toContain('Amazing product!');
      expect(prompt).toContain('Daily Wellness Bundle');
    });

    it('should build prompt for 1-star review', () => {
      const prompt = buildReviewReplyPrompt(
        'amazon',
        1,
        'Terrible experience',
        'Product Name',
        'en',
      );

      expect(prompt).toContain('1/5');
      expect(prompt).toContain('empathetic and solution-focused');
      expect(prompt).toContain('Terrible experience');
    });

    it('should build prompt for 3-star review', () => {
      const prompt = buildReviewReplyPrompt(
        'tiktok',
        3,
        'Average product',
        'Product Name',
        'en',
      );

      expect(prompt).toContain('3/5');
      expect(prompt).toContain('understanding and helpful');
    });

    it('should use target language when provided', () => {
      const prompt = buildReviewReplyPrompt(
        'shopify',
        5,
        'Great!',
        'Product',
        'en',
        'zh',
      );

      expect(prompt).toContain('Reply language: zh');
      expect(prompt).toContain('Reply in zh language only');
    });

    it('should default to review language when no target language', () => {
      const prompt = buildReviewReplyPrompt(
        'shopify',
        5,
        'Great!',
        'Product',
        'fr',
      );

      expect(prompt).toContain('Reply language: fr');
    });

    it('should include guidelines', () => {
      const prompt = buildReviewReplyPrompt(
        'shopify',
        5,
        'Great!',
        'Product',
        'en',
      );

      expect(prompt).toContain('under 80 words');
      expect(prompt).toContain('genuine');
      expect(prompt).toContain('Never make medical claims');
    });
  });

  describe('WORKFLOW_DESCRIPTIONS', () => {
    it('should have descriptions for all workflows', () => {
      expect(WORKFLOW_DESCRIPTIONS.orderSync).toBeDefined();
      expect(WORKFLOW_DESCRIPTIONS.supportChat).toBeDefined();
      expect(WORKFLOW_DESCRIPTIONS.reviewReply).toBeDefined();
    });

    it('should have required fields for each workflow', () => {
      Object.values(WORKFLOW_DESCRIPTIONS).forEach((workflow) => {
        expect(workflow.name).toBeDefined();
        expect(workflow.description).toBeDefined();
        expect(workflow.trigger).toBeDefined();
        expect(workflow.steps).toBeInstanceOf(Array);
        expect(workflow.steps.length).toBeGreaterThan(0);
      });
    });

    it('should have valid step structure', () => {
      const firstStep = WORKFLOW_DESCRIPTIONS.orderSync.steps[0];
      expect(firstStep.id).toBeDefined();
      expect(firstStep.name).toBeDefined();
      expect(firstStep.description).toBeDefined();
    });

    it('should describe orderSync workflow correctly', () => {
      expect(WORKFLOW_DESCRIPTIONS.orderSync.trigger).toContain('cron');
      expect(WORKFLOW_DESCRIPTIONS.orderSync.description).toContain('Shopify');
      expect(WORKFLOW_DESCRIPTIONS.orderSync.description).toContain('Pinecone');
    });

    it('should describe supportChat workflow correctly', () => {
      expect(WORKFLOW_DESCRIPTIONS.supportChat.trigger).toContain('webhook');
      expect(WORKFLOW_DESCRIPTIONS.supportChat.description).toContain('Pinecone');
      expect(WORKFLOW_DESCRIPTIONS.supportChat.description).toContain('escalation');
    });
  });
});
