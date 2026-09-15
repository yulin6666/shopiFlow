import { NextResponse } from 'next/server';
import type { HealthProbeResult } from '@/types';

export async function POST(): Promise<NextResponse<HealthProbeResult>> {
  const n8nUrl = process.env.N8N_WEBHOOK_BASE_URL;
  if (!n8nUrl) {
    return NextResponse.json(
      { healthy: false, latencyMs: null, error: 'N8N_WEBHOOK_BASE_URL not configured' },
      { status: 500 }
    );
  }

  const probePayload = {
    message: 'Health check probe',
    ticketId: `probe-${Date.now()}`,
    customerName: 'Monitoring System',
    customerEmail: 'monitoring@shopiflow.internal',
    platform: 'shopify',
    orderId: null,
  };

  const startTime = Date.now();

  try {
    const response = await fetch(`${n8nUrl}/webhook/shopify-support`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(probePayload),
      signal: AbortSignal.timeout(10000),
    });

    const latencyMs = Date.now() - startTime;
    const data = await response.json().catch(() => null);

    return NextResponse.json({
      healthy: response.ok,
      status: response.status,
      latencyMs,
      response: data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { healthy: false, latencyMs: Date.now() - startTime, error: error.message },
      { status: 502 }
    );
  }
}
