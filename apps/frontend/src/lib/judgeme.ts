import { Review } from '@/types';

const JUDGE_ME_BASE = 'https://judge.me/api/v1';

export interface JudgeMeReview {
  id: number;
  title: string;
  body: string;
  rating: number;
  created_at: string;
  hidden: boolean;
  reviewer: {
    name: string;
    email?: string;
  };
  product_title: string;
  // Judge.me 有时返回语言字段
  language?: string;
  source_type?: string; // 'shopify' | 'amazon' | etc
}

interface JudgeMeResponse {
  reviews: JudgeMeReview[];
  current_page: number;
  total_pages: number;
  per_page: number;
}

export async function fetchJudgeMeReviews(
  apiToken: string,
  shopDomain: string,
  perPage = 20,
  page = 1,
): Promise<JudgeMeReview[]> {
  const url = new URL(`${JUDGE_ME_BASE}/reviews`);
  url.searchParams.set('api_token', apiToken);
  url.searchParams.set('shop_domain', shopDomain);
  url.searchParams.set('per_page', String(perPage));
  url.searchParams.set('page', String(page));

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    next: { revalidate: 300 }, // cache 5 min
  });

  if (!res.ok) {
    throw new Error(`Judge.me API error: ${res.status} ${res.statusText}`);
  }

  const data: JudgeMeResponse = await res.json();
  return data.reviews ?? [];
}

// 将 Judge.me 格式转换为 Review 类型
export function mapJudgeMeReview(r: JudgeMeReview): Review {
  // Judge.me 本身是 Shopify 插件，source_type 可能标注来源
  const platform =
    r.source_type === 'amazon'
      ? 'amazon'
      : r.source_type === 'tiktok'
      ? 'tiktok'
      : 'shopify';

  // 简单语言检测：非 ASCII 字符占比
  const hasNonAscii = (s: string) => /[^\x00-\x7F]/.test(s);
  const language = r.language ?? (hasNonAscii(r.body) ? 'zh' : 'en');

  return {
    id: String(r.id),
    platform,
    author: r.reviewer.name,
    rating: r.rating,
    title: r.title || `${r.rating}-star review`,
    content: r.body,
    date: r.created_at.slice(0, 10),
    productName: r.product_title,
    language,
    status: 'pending',
  };
}
