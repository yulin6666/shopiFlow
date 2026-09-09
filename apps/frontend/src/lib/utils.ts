import { type ClassValue, clsx } from 'clsx';

// Simple className merger (no clsx dependency needed)
export function cn(...inputs: ClassValue[]) {
  return inputs
    .filter(Boolean)
    .join(' ')
    .trim();
}

export function formatCurrency(amount: string | number, currency = 'USD'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(num);
}

export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(dateString));
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

export function getPlatformColor(platform: string): string {
  const colors: Record<string, string> = {
    shopify: 'bg-green-100 text-green-800',
    amazon: 'bg-orange-100 text-orange-800',
    tiktok: 'bg-pink-100 text-pink-800',
  };
  return colors[platform] ?? 'bg-gray-100 text-gray-800';
}

export function getEscalationColor(level: string): string {
  const colors: Record<string, string> = {
    auto: 'bg-green-100 text-green-700',
    draft: 'bg-yellow-100 text-yellow-700',
    escalated: 'bg-red-100 text-red-700',
  };
  return colors[level] ?? 'bg-gray-100 text-gray-700';
}

export function getRatingStars(rating: number): string {
  return '★'.repeat(rating) + '☆'.repeat(5 - rating);
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
