import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { EscalationLevel, TicketSource } from '@/types';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limiter';

const N8N_WEBHOOK = process.env.N8N_WEBHOOK_BASE_URL;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, source = 'shopify', orderId, customerId, customerName, customerEmail, ticketId } = body as {
      message: string;
      source?: TicketSource;
      orderId?: string;
      customerId?: string;
      customerName?: string;
      customerEmail?: string;
      ticketId?: string;
    };

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (!N8N_WEBHOOK) {
      return NextResponse.json({ error: 'N8N_WEBHOOK_BASE_URL not configured' }, { status: 500 });
    }

    // 速率限制检查：每个 IP 每分钟最多 5 次请求
    const identifier = getClientIdentifier(req);
    const rateLimitResult = await checkRateLimit(identifier, '/api/support');

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil((rateLimitResult.resetAt.getTime() - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetAt.toISOString(),
            'Retry-After': String(Math.ceil((rateLimitResult.resetAt.getTime() - Date.now()) / 1000)),
          },
        },
      );
    }

    // 调用 n8n webhook
    const webhookPath = source === 'shopify' ? '/webhook/shopify-support' : '/webhook/gorgias-support';

    const n8nResponse = await axios.post(
      `${N8N_WEBHOOK}${webhookPath}`,
      {
        message,
        platform: source,
        orderId: orderId || null,
        customerId: customerId || null,
        customerName: customerName || 'Customer',
        customerEmail: customerEmail || '',
        ticketId: ticketId || Date.now(),
      },
      { timeout: 120000 },
    );

    const data = n8nResponse.data;

    let escalation: EscalationLevel = 'auto';
    let reply = '';
    let escalationReason: string | undefined;
    let draftReply: string | undefined;

    if (data.status === 'auto_replied') {
      escalation = 'auto';
      reply = data.reply || '';
    } else if (data.status === 'needs_review') {
      escalation = 'draft';
      reply = 'Draft reply prepared — awaiting human approval before sending.';
      draftReply = data.reply || '';
      escalationReason = data.reason || 'Needs review';
    } else if (data.status === 'escalated') {
      escalation = 'escalated';
      reply = '🚨 This message has been escalated to a human agent due to high-risk content.';
      escalationReason = data.reason || 'High-risk';
    }

    return NextResponse.json(
      {
        reply,
        escalation,
        escalationReason: escalationReason ?? null,
        draftReply: draftReply ?? null,
        source,
        ticketId: data.ticketId,
      },
      {
        headers: {
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
        },
      },
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    console.error('[support API]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
