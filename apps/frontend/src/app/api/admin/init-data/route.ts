import { NextResponse } from 'next/server';
import axios from 'axios';

const N8N_BASE = process.env.N8N_WEBHOOK_BASE_URL;

export async function POST() {
  if (!N8N_BASE) {
    return NextResponse.json({ error: 'N8N_WEBHOOK_BASE_URL not configured' }, { status: 500 });
  }
  try {
    const res = await axios.post(`${N8N_BASE}/webhook/data-init`, {}, { timeout: 120000 });
    return NextResponse.json(res.data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[init-data]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
