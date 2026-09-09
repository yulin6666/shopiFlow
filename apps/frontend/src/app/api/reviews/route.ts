import { NextResponse } from 'next/server';
import { mockReviews } from '@/lib/reviews';

export async function GET() {
  return NextResponse.json({ reviews: mockReviews, source: 'mock' });
}
