import { NextRequest, NextResponse } from 'next/server';
import { getOrders } from '@/lib/shopify';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') ?? '20', 10);

    const orders = await getOrders(Math.min(limit, 50));
    return NextResponse.json({ orders });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch orders';
    console.error('[orders API]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
