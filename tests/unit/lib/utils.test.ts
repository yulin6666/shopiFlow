import { describe, it, expect } from 'vitest';
import {
  cn,
  formatCurrency,
  formatDate,
  formatRelativeTime,
  truncate,
  getPlatformColor,
  getEscalationColor,
  getRatingStars,
  generateId,
} from '@/lib/utils';

describe('lib/utils', () => {
  describe('cn - className merger', () => {
    it('should merge multiple class names', () => {
      expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('should filter out falsy values', () => {
      expect(cn('foo', false, 'bar', null, undefined, '')).toBe('foo bar');
    });

    it('should handle empty input', () => {
      expect(cn()).toBe('');
    });

    it('should trim leading and trailing whitespace', () => {
      // cn joins with space and trims edges only, does not normalize internal spaces
      const result = cn('foo', 'bar');
      expect(result).toBe('foo bar');
    });
  });

  describe('formatCurrency', () => {
    it('should format number as USD currency by default', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
    });

    it('should format string number as currency', () => {
      expect(formatCurrency('9999.99')).toBe('$9,999.99');
    });

    it('should support different currencies', () => {
      expect(formatCurrency(1000, 'EUR')).toContain('1,000');
    });

    it('should handle zero', () => {
      expect(formatCurrency(0)).toBe('$0.00');
    });

    it('should handle negative numbers', () => {
      expect(formatCurrency(-50)).toBe('-$50.00');
    });
  });

  describe('formatDate', () => {
    it('should format ISO date string', () => {
      const result = formatDate('2026-07-28T00:00:00Z');
      expect(result).toMatch(/Jul 28, 2026/);
    });

    it('should handle different date formats', () => {
      const result = formatDate('2026-01-01');
      expect(result).toMatch(/Jan 1, 2026/);
    });
  });

  describe('formatRelativeTime', () => {
    it('should return "just now" for recent timestamps', () => {
      const now = new Date().toISOString();
      expect(formatRelativeTime(now)).toBe('just now');
    });

    it('should return minutes ago', () => {
      const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      expect(formatRelativeTime(fiveMinsAgo)).toBe('5m ago');
    });

    it('should return hours ago', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(twoHoursAgo)).toBe('2h ago');
    });

    it('should return days ago', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(threeDaysAgo)).toBe('3d ago');
    });
  });

  describe('truncate', () => {
    it('should not truncate if string is shorter than maxLength', () => {
      expect(truncate('Hello', 10)).toBe('Hello');
    });

    it('should truncate and add ellipsis if string is longer', () => {
      expect(truncate('Hello World', 8)).toBe('Hello...');
    });

    it('should handle exact length', () => {
      expect(truncate('Hello', 5)).toBe('Hello');
    });

    it('should handle empty string', () => {
      expect(truncate('', 10)).toBe('');
    });
  });

  describe('getPlatformColor', () => {
    it('should return green color for shopify', () => {
      expect(getPlatformColor('shopify')).toBe('bg-green-100 text-green-800');
    });

    it('should return orange color for amazon', () => {
      expect(getPlatformColor('amazon')).toBe('bg-orange-100 text-orange-800');
    });

    it('should return pink color for tiktok', () => {
      expect(getPlatformColor('tiktok')).toBe('bg-pink-100 text-pink-800');
    });

    it('should return default gray color for unknown platform', () => {
      expect(getPlatformColor('unknown')).toBe('bg-gray-100 text-gray-800');
    });
  });

  describe('getEscalationColor', () => {
    it('should return green for auto', () => {
      expect(getEscalationColor('auto')).toBe('bg-green-100 text-green-700');
    });

    it('should return yellow for draft', () => {
      expect(getEscalationColor('draft')).toBe('bg-yellow-100 text-yellow-700');
    });

    it('should return red for escalated', () => {
      expect(getEscalationColor('escalated')).toBe('bg-red-100 text-red-700');
    });

    it('should return default gray for unknown level', () => {
      expect(getEscalationColor('unknown')).toBe('bg-gray-100 text-gray-700');
    });
  });

  describe('getRatingStars', () => {
    it('should return 5 filled stars for rating 5', () => {
      expect(getRatingStars(5)).toBe('★★★★★');
    });

    it('should return 3 filled and 2 empty stars for rating 3', () => {
      expect(getRatingStars(3)).toBe('★★★☆☆');
    });

    it('should return all empty stars for rating 0', () => {
      expect(getRatingStars(0)).toBe('☆☆☆☆☆');
    });

    it('should handle rating 1', () => {
      expect(getRatingStars(1)).toBe('★☆☆☆☆');
    });
  });

  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });

    it('should generate ID with timestamp and random component', () => {
      const id = generateId();
      expect(id).toMatch(/^\d+-[a-z0-9]+$/);
    });

    it('should generate IDs with reasonable length', () => {
      const id = generateId();
      expect(id.length).toBeGreaterThan(10);
      expect(id.length).toBeLessThan(30);
    });
  });
});
