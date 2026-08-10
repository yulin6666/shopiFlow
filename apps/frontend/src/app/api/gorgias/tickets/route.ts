import { NextResponse } from 'next/server';
import { getOpenTickets } from '@/lib/gorgias';

export async function GET() {
  try {
    const tickets = await getOpenTickets(30);
    return NextResponse.json({ tickets });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch tickets';
    console.error('[gorgias tickets API]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
