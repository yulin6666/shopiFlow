import { describe, it, expect } from 'vitest';
import {
  SUPPORT_SYSTEM_PROMPT,
  SUPPORT_ESCALATION_MESSAGES,
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

  describe('WORKFLOW_DESCRIPTIONS', () => {
    it('should have descriptions for active workflows', () => {
      expect(WORKFLOW_DESCRIPTIONS.orderSync).toBeDefined();
      expect(WORKFLOW_DESCRIPTIONS.supportChat).toBeDefined();
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
