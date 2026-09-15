import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db';
import type {
  MonitoringMetricsSummary,
  MonitoringMetricsByHour,
  MonitoringRecentError,
  MonitoringRecentExecution,
} from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 数据库返回的原始行（snake_case）
interface SummaryRow {
  total_executions_24h: string;
  success_rate_pct: string;
  degradation_rate_pct: string;
  avg_latency_ms: string;
  p95_latency_ms: string;
  avg_ai_call_ms: string;
  last_execution_at: string | null;
  auto_count: string;
  draft_count: string;
  escalate_count: string;
}

interface HourlyRow {
  time_bucket: string;
  total_executions: string;
  success_count: string;
  failed_count: string;
  degraded_count: string;
  p50_latency_ms: string;
  p95_latency_ms: string;
  p99_latency_ms: string;
  avg_latency_ms: string;
  auto_count: string;
  draft_count: string;
  escalate_count: string;
}

interface ErrorRow {
  id: string;
  created_at: string;
  error_msg: string;
  details: any;
}

interface ExecutionRow {
  id: string;
  created_at: string;
  status: string;
  details: any;
}

export async function GET() {
  try {
    const [summaryRow] = await queryDb<SummaryRow>(
      'SELECT * FROM monitoring_summary_mv LIMIT 1'
    );

    const [aiCallRow] = await queryDb<{ avg_ai_call_ms: string }>(
      `SELECT ROUND(AVG((details->>'aiCallTimeMs')::numeric), 0) AS avg_ai_call_ms
       FROM ai_processing_log
       WHERE workflow_id = 'shopify-support-handler'
         AND created_at > NOW() - INTERVAL '24 hours'
         AND details->>'aiCallTimeMs' IS NOT NULL`
    );

    const hourlyRows = await queryDb<HourlyRow>(
      'SELECT * FROM monitoring_metrics_mv ORDER BY time_bucket DESC LIMIT 24'
    );

    const errorRows = await queryDb<ErrorRow>(
      `SELECT id, created_at, error_msg, details
       FROM ai_processing_log
       WHERE workflow_id = 'shopify-support-handler'
         AND action = 'workflow_error'
         AND status = 'failed'
         AND created_at > NOW() - INTERVAL '24 hours'
       ORDER BY created_at DESC
       LIMIT 10`
    );

    const executionRows = await queryDb<ExecutionRow>(
      `SELECT id, created_at, status, details
       FROM ai_processing_log
       WHERE workflow_id = 'shopify-support-handler'
         AND action != 'workflow_error'
         AND status IN ('success', 'degraded', 'failed')
         AND created_at > NOW() - INTERVAL '24 hours'
       ORDER BY created_at DESC
       LIMIT 50`
    );

    const summary: MonitoringMetricsSummary = summaryRow
      ? {
          totalExecutions24h: Number(summaryRow.total_executions_24h) || 0,
          successRatePct: Number(summaryRow.success_rate_pct) || 0,
          degradationRatePct: Number(summaryRow.degradation_rate_pct) || 0,
          avgLatencyMs: Number(summaryRow.avg_latency_ms) || 0,
          p95LatencyMs: Number(summaryRow.p95_latency_ms) || 0,
          avgAiCallMs: Number(aiCallRow?.avg_ai_call_ms) || 0,
          lastExecutionAt: summaryRow.last_execution_at,
          autoCount: Number(summaryRow.auto_count) || 0,
          draftCount: Number(summaryRow.draft_count) || 0,
          escalateCount: Number(summaryRow.escalate_count) || 0,
        }
      : {
          totalExecutions24h: 0,
          successRatePct: 0,
          degradationRatePct: 0,
          avgLatencyMs: 0,
          p95LatencyMs: 0,
          avgAiCallMs: 0,
          lastExecutionAt: null,
          autoCount: 0,
          draftCount: 0,
          escalateCount: 0,
        };

    const hourlyMetrics: MonitoringMetricsByHour[] = hourlyRows.map((row) => ({
      timeBucket: row.time_bucket,
      totalExecutions: Number(row.total_executions) || 0,
      successCount: Number(row.success_count) || 0,
      failedCount: Number(row.failed_count) || 0,
      degradedCount: Number(row.degraded_count) || 0,
      p50LatencyMs: Number(row.p50_latency_ms) || 0,
      p95LatencyMs: Number(row.p95_latency_ms) || 0,
      p99LatencyMs: Number(row.p99_latency_ms) || 0,
      avgLatencyMs: Number(row.avg_latency_ms) || 0,
      autoCount: Number(row.auto_count) || 0,
      draftCount: Number(row.draft_count) || 0,
      escalateCount: Number(row.escalate_count) || 0,
    }));

    const recentErrors: MonitoringRecentError[] = errorRows.map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      errorMsg: row.error_msg,
      details: row.details,
      n8nExecutionId: row.details?.n8nExecutionId || undefined,
      n8nWorkflowId: row.details?.n8nWorkflowId || undefined,
      n8nWorkflowName: row.details?.n8nWorkflowName || undefined,
      failedNode: row.details?.failedNode || row.details?.failedNode || undefined,
      ticketId: row.details?.ticketId || undefined,
    }));

    const recentExecutions: MonitoringRecentExecution[] = executionRows.map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      status: row.status,
      classification: row.details?.classification || 'unknown',
      executionTimeMs: Number(row.details?.execution_time_ms) || 0,
      aiCallTimeMs: Number(row.details?.aiCallTimeMs) || 0,
      ticketId: row.details?.ticketId || '',
      riskLevel: row.details?.riskLevel || 'unknown',
    }));

    return NextResponse.json({ summary, hourlyMetrics, recentErrors, recentExecutions });
  } catch (error: any) {
    console.error('[monitoring/metrics] Failed to fetch metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics', details: error.message },
      { status: 500 }
    );
  }
}
