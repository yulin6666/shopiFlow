import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { ReviewPlatform } from '@/types';

const N8N_WEBHOOK = process.env.N8N_WEBHOOK_BASE_URL;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { reviewId, platform, rating, title, content, productTitle, reviewerName } = body as {
      reviewId?: string | number;
      platform: ReviewPlatform;
      rating: number;
      title?: string;
      content: string;
      productTitle: string;
      reviewerName?: string;
    };

    if (!content?.trim() || !platform || !productTitle) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!N8N_WEBHOOK) {
      return NextResponse.json({ error: 'N8N_WEBHOOK_BASE_URL not configured' }, { status: 500 });
    }

    // Call n8n webhook
    const n8nResponse = await axios.post(
      `${N8N_WEBHOOK}/webhook/judgeme-review`,
      {
        reviewId: reviewId || Date.now(),
        rating,
        title: title || '',
        body: content,
        productTitle,
        reviewerName: reviewerName || 'Customer',
        platform,
      },
      { timeout: 30000 },
    );

    const data = n8nResponse.data;

    // n8n returns: { status: 'auto_replied' | 'needs_approval', rating, reply, reviewId, productTitle, reviewerName }
    return NextResponse.json({
      reply: data.reply || '',
      status: data.status || 'auto_replied',
      needsApproval: data.status === 'needs_approval',
      reviewId: data.reviewId,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    console.error('[review API]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
