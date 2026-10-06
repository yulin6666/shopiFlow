import { NextRequest, NextResponse } from 'next/server';

const N8N_WEBHOOK_BASE_URL = process.env.N8N_WEBHOOK_BASE_URL || process.env.NEXT_PUBLIC_N8N_WEBHOOK_BASE_URL || 'http://localhost:5678';

export async function POST(req: NextRequest) {
  try {
    // Trigger n8n workflow to manually poll Gmail and Forms
    const response = await fetch(`${N8N_WEBHOOK_BASE_URL}/webhook/google-scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trigger: 'manual' }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: 'n8n webhook 调用失败' },
        { status: 500 }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      message: '处理完成',
    });
  } catch (error) {
    console.error('Google scan error:', error);
    return NextResponse.json(
      { success: false, error: '扫描失败' },
      { status: 500 }
    );
  }
}
