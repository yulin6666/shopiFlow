import { NextRequest, NextResponse } from 'next/server';
import { getProducts } from '@/lib/shopify';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') ?? '20', 10);

    const products = await getProducts(Math.min(limit, 50));
    return NextResponse.json({ products });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch products';
    console.error('[products API]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
