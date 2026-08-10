import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { EscalationLevel, TicketSource } from '@/types';

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

    // Route to different webhook based on platform
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

    return NextResponse.json({
      reply,
      escalation,
      escalationReason: escalationReason ?? null,
      draftReply: draftReply ?? null,
      source,
      ticketId: data.ticketId,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    console.error('[support API]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
