import { NextRequest, NextResponse } from 'next/server';
import { getTicketMessages, createTicketMessage } from '@/lib/gorgias';

// GET /api/gorgias/reply?ticketId=123 — fetch messages for a ticket
export async function GET(req: NextRequest) {
  const ticketId = parseInt(new URL(req.url).searchParams.get('ticketId') ?? '', 10);
  if (!ticketId) return NextResponse.json({ error: 'ticketId required' }, { status: 400 });

  try {
    const messages = await getTicketMessages(ticketId);
    return NextResponse.json({ messages });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch messages';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/gorgias/reply — send AI reply to a Gorgias ticket
export async function POST(req: NextRequest) {
  try {
    const { ticketId, reply } = await req.json() as { ticketId: number; reply: string };
    if (!ticketId || !reply?.trim()) {
      return NextResponse.json({ error: 'ticketId and reply required' }, { status: 400 });
    }

    await createTicketMessage(ticketId, reply);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to send reply';
    console.error('[gorgias reply API]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
