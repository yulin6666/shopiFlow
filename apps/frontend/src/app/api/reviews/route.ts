import { NextRequest, NextResponse } from 'next/server';
import { fetchJudgeMeReviews, mapJudgeMeReview } from '@/lib/judgeme';
import { mockReviews } from '@/lib/reviews';

const JUDGE_ME_TOKEN = process.env.JUDGE_ME_API_TOKEN;
const JUDGE_ME_SHOP = process.env.JUDGE_ME_SHOP_DOMAIN;

export async function GET(req: NextRequest) {
  // 没有配置 Judge.me credentials → 返回 mock 数据
  if (!JUDGE_ME_TOKEN || !JUDGE_ME_SHOP) {
    return NextResponse.json({ reviews: mockReviews, source: 'mock' });
  }

  try {
    const { searchParams } = new URL(req.url);
    const perPage = Math.min(parseInt(searchParams.get('per_page') ?? '20', 10), 50);
    const page = parseInt(searchParams.get('page') ?? '1', 10);

    const raw = await fetchJudgeMeReviews(JUDGE_ME_TOKEN, JUDGE_ME_SHOP, perPage, page);
    const reviews = raw
      .filter((r) => !r.hidden)
      .map(mapJudgeMeReview);

    return NextResponse.json({ reviews, source: 'judgeme' });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch reviews';
    console.error('[reviews API]', msg);
    // Graceful fallback: return mock with error flag
    return NextResponse.json(
      { reviews: mockReviews, source: 'mock', warning: msg },
      { status: 200 },
    );
  }
}
