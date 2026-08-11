import { GorgiasTicket, GorgiasMessage, TicketSource } from '@/types';

const GORGIAS_BASE_URL = process.env.GORGIAS_BASE_URL; // https://your-account.gorgias.com/api
const GORGIAS_EMAIL = process.env.GORGIAS_EMAIL;
const GORGIAS_API_KEY = process.env.GORGIAS_API_KEY;

function gorgiasAuth(): string {
  // Gorgias 使用 HTTP Basic Auth: email:api_key
  return Buffer.from(`${GORGIAS_EMAIL}:${GORGIAS_API_KEY}`).toString('base64');
}

async function gorgiasGet<T>(path: string): Promise<T> {
  if (!GORGIAS_BASE_URL || !GORGIAS_EMAIL || !GORGIAS_API_KEY) {
    throw new Error('Gorgias credentials not configured');
  }

  const res = await fetch(`${GORGIAS_BASE_URL}${path}`, {
    headers: {
      Authorization: `Basic ${gorgiasAuth()}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Gorgias API error: ${res.status} ${res.statusText} — ${body}`);
  }

  return res.json() as Promise<T>;
}

async function gorgiasPost<T>(path: string, body: unknown): Promise<T> {
  if (!GORGIAS_BASE_URL || !GORGIAS_EMAIL || !GORGIAS_API_KEY) {
    throw new Error('Gorgias credentials not configured');
  }

  const res = await fetch(`${GORGIAS_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${gorgiasAuth()}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gorgias API error: ${res.status} — ${text}`);
  }

  return res.json() as Promise<T>;
}

// ---- Types (Gorgias API shapes) ----

interface GorgiasRawTicket {
  id: number;
  external_id: string | null;
  status: string; // 'open' | 'closed' | 'pending'
  channel: string;
  subject: string;
  created_datetime: string;
  updated_datetime: string;
  customer: { id: number; name: string; email: string };
  tags: Array<{ name: string }>;
  is_unread: boolean;
  meta: Record<string, unknown>;
}

interface GorgiasRawMessage {
  id: number;
  body_text: string;
  body_html: string;
  source: { type: string; from: { name: string; address: string } };
  created_datetime: string;
  sent_datetime: string | null;
  receiver: { name?: string; address?: string } | null;
  attachments: unknown[];
}

// ---- Public API ----

export async function getOpenTickets(limit = 20): Promise<GorgiasTicket[]> {
  const data = await gorgiasGet<{ data: GorgiasRawTicket[]; meta: unknown }>(
    `/tickets?status=open&limit=${limit}&order_by=created_datetime:desc`,
  );
  return data.data.map(mapTicket);
}

export async function getTicketMessages(ticketId: number): Promise<GorgiasMessage[]> {
  const data = await gorgiasGet<{ data: GorgiasRawMessage[] }>(
    `/tickets/${ticketId}/messages`,
  );
  return data.data.map(mapMessage);
}

export async function createTicketMessage(
  ticketId: number,
  body: string,
): Promise<void> {
  await gorgiasPost(`/tickets/${ticketId}/messages`, {
    body_text: body,
    source: { type: 'email', from: { address: GORGIAS_EMAIL } },
    channel: 'email',
  });
}

// ---- Mappers ----

function mapTicket(raw: GorgiasRawTicket): GorgiasTicket {
  const channelMap: Record<string, TicketSource> = {
    email: 'shopify',
    shopify: 'shopify',
    amazon: 'amazon',
    tiktok: 'tiktok',
    chat: 'shopify',
    sms: 'shopify',
  };

  return {
    id: raw.id,
    subject: raw.subject,
    status: raw.status as GorgiasTicket['status'],
    channel: raw.channel,
    source: channelMap[raw.channel] ?? 'shopify',
    customerName: raw.customer?.name ?? 'Unknown',
    customerEmail: raw.customer?.email ?? '',
    createdAt: raw.created_datetime,
    updatedAt: raw.updated_datetime,
    tags: raw.tags.map((t) => t.name),
    isUnread: raw.is_unread,
  };
}

function mapMessage(raw: GorgiasRawMessage): GorgiasMessage {
  return {
    id: raw.id,
    bodyText: raw.body_text,
    fromName: raw.source.from.name,
    fromAddress: raw.source.from.address,
    createdAt: raw.created_datetime,
  };
}
