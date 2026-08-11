import { NextRequest, NextResponse } from 'next/server';
import { getOpenTickets, getTicketMessages } from '@/lib/gorgias';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');

    const tickets = await getOpenTickets(limit);

    // 每个 ticket 再拉一次 messages 获取客户的第一条消息
    const results = await Promise.all(
      tickets.map(async (ticket) => {
        try {
          const messages = await getTicketMessages(ticket.id);
          const customerMessage = messages.find(
            (m) => !m.fromAddress.includes('gorgias.com')
          );
          return {
            ticketId: ticket.id,
            subject: ticket.subject,
            message: customerMessage?.bodyText || ticket.subject,
            customerName: ticket.customerName,
            customerEmail: ticket.customerEmail,
            status: ticket.status,
            createdAt: ticket.createdAt,
          };
        } catch {
          return {
            ticketId: ticket.id,
            subject: ticket.subject,
            message: ticket.subject,
            customerName: ticket.customerName,
            customerEmail: ticket.customerEmail,
            status: ticket.status,
            createdAt: ticket.createdAt,
          };
        }
      })
    );

    return NextResponse.json({ success: true, count: results.length, messages: results });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    console.error('[gorgias import API]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
