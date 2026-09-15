'use client';

import { useEffect, useState, useCallback } from 'react';
import Button from '@/components/ui/Button';
import type { MonitoringMetricsResponse, HealthProbeResult } from '@/types';

export default function MonitoringPage() {
  const [data, setData] = useState<MonitoringMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [probing, setProbing] = useState(false);
  const [probeResult, setProbeResult] = useState<HealthProbeResult | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/monitoring/metrics');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json: MonitoringMetricsResponse = await response.json();
      setData(json);
      setLastRefresh(new Date());
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const runProbe = async () => {
    try {
      setProbing(true);
      setProbeResult(null);
      const response = await fetch('/api/monitoring/probe', { method: 'POST' });
      const json: HealthProbeResult = await response.json();
      setProbeResult(json);
    } catch (err: any) {
      setProbeResult({ healthy: false, latencyMs: null, error: err.message });
    } finally {
      setProbing(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500 text-sm">Loading monitoring data...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-500 text-sm mb-4">Failed to load: {error}</p>
          <Button onClick={fetchMetrics}>Retry</Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { summary, hourlyMetrics, recentErrors, recentExecutions } = data;
  const totalClassifications = summary.autoCount + summary.draftCount + summary.escalateCount;

  return (
    <div className="min-h-screen" style={{ background: '#F6F1E8' }}>
      <div className="max-w-7xl mx-auto p-8 space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold" style={{ fontFamily: 'DM Serif Display, serif', color: '#1F2421' }}>
              Workflow <span style={{ color: '#C8853F', fontStyle: 'italic' }}>Monitoring</span>
            </h1>
            <p className="text-sm mt-2" style={{ color: '#8A8A80' }}>
              Real-time health metrics for shopify-support-handler
              {lastRefresh && (
                <span className="ml-2">
                  · Updated {lastRefresh.toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={runProbe}
              disabled={probing}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: '#FFFFFF',
                border: '1px solid #E2D9C8',
                color: '#1F2421',
              }}
            >
              {probing ? 'Probing...' : 'Run Health Check'}
            </button>
            <button
              onClick={fetchMetrics}
              disabled={loading}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:shadow-lg"
              style={{
                background: '#C8853F',
                color: '#FFFFFF',
              }}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Probe Result */}
        {probeResult && (
          <div
            className="p-4 rounded-xl border"
            style={{
              background: probeResult.healthy ? '#FFFFFF' : '#FBF7EF',
              borderColor: probeResult.healthy ? '#C8853F' : '#E2D9C8',
            }}
          >
            <p className="font-semibold text-sm" style={{ color: '#1F2421' }}>
              {probeResult.healthy ? '✅ Health check passed' : '❌ Health check failed'}
            </p>
            {probeResult.latencyMs !== null && (
              <p className="text-xs mt-1" style={{ color: '#8A8A80' }}>
                Latency: {probeResult.latencyMs}ms
              </p>
            )}
            {probeResult.error && (
              <p className="text-xs mt-1 font-mono" style={{ color: '#8A8A80' }}>
                Error: {probeResult.error}</p>
            )}
          </div>
        )}

        {/* 1. 可用性监控 (Availability) */}
        <section
          className="p-6 rounded-xl shadow-sm"
          style={{ background: '#FFFFFF', border: '1px solid #E2D9C8' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div
              className="px-3 py-1 rounded-full text-xs font-semibold"
              style={{ background: '#F0E3D0', color: '#C8853F' }}
            >
              Availability
            </div>
            <span className="text-sm font-medium" style={{ color: '#8A8A80' }}>System Uptime</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs mb-1" style={{ color: '#8A8A80' }}>Webhook Reachability</p>
              <p className="text-sm font-medium" style={{ color: '#1F2421' }}>
                {probeResult?.healthy ? '✅ Responding' : '⏳ Not Tested'}
              </p>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: '#8A8A80' }}>Workflow Status</p>
              <p className="text-sm font-medium" style={{ color: '#1F2421' }}>
                {summary.totalExecutions24h > 0 ? '✅ Active' : '⚠️ Inactive'}
              </p>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: '#8A8A80' }}>Last Execution</p>
              <p className="text-sm font-medium" style={{ color: '#1F2421' }}>
                {summary.lastExecutionAt
                  ? new Date(summary.lastExecutionAt).toLocaleString('en-US')
                  : 'No data'}
              </p>
            </div>
          </div>
        </section>

        {/* 2. 性能监控 (Performance) */}
        <section
          className="p-6 rounded-xl shadow-sm"
          style={{ background: '#FFFFFF', border: '1px solid #E2D9C8' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div
              className="px-3 py-1 rounded-full text-xs font-semibold"
              style={{ background: '#F0E3D0', color: '#C8853F' }}
            >
              Performance
            </div>
            <span className="text-sm font-medium" style={{ color: '#8A8A80' }}>Response Time</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs mb-1" style={{ color: '#8A8A80' }}>Avg Response Time</p>
              <p className="text-2xl font-bold" style={{ color: '#1F2421' }}>
                {summary.avgLatencyMs.toFixed(0)}
                <span className="text-sm font-normal ml-1" style={{ color: '#8A8A80' }}>ms</span>
              </p>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: '#8A8A80' }}>P95 Latency</p>
              <p className="text-2xl font-bold" style={{ color: '#1F2421' }}>
                {summary.p95LatencyMs.toFixed(0)}
                <span className="text-sm font-normal ml-1" style={{ color: '#8A8A80' }}>ms</span>
              </p>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: '#8A8A80' }}>AI Call Latency</p>
              <p className="text-2xl font-bold" style={{ color: '#1F2421' }}>
                {summary.avgAiCallMs.toFixed(0)}
                <span className="text-sm font-normal ml-1" style={{ color: '#8A8A80' }}>ms</span>
              </p>
              <p className="text-xs mt-1" style={{ color: '#8A8A80' }}>
                LangChain Agent node execution time
              </p>
            </div>
          </div>

          {/* Execution time dropdown */}
          {recentExecutions && recentExecutions.length > 0 && (
            <div className="mt-5 pt-4 border-t" style={{ borderColor: '#E2D9C8' }}>
              <details className="group">
                <summary
                  className="flex items-center gap-2 cursor-pointer text-xs font-semibold select-none"
                  style={{ color: '#8A8A80' }}
                >
                  <span className="transition-transform group-open:rotate-90 inline-block">▶</span>
                  Execution History ({recentExecutions.length} records, last 24h)
                </summary>
                <div className="mt-3 max-h-72 overflow-y-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr style={{ borderBottom: '1px solid #E2D9C8' }}>
                        <th className="text-left py-2 pr-4 font-semibold" style={{ color: '#8A8A80' }}>Time</th>
                        <th className="text-left py-2 pr-4 font-semibold" style={{ color: '#8A8A80' }}>Ticket ID</th>
                        <th className="text-left py-2 pr-4 font-semibold" style={{ color: '#8A8A80' }}>Classification</th>
                        <th className="text-left py-2 pr-4 font-semibold" style={{ color: '#8A8A80' }}>Status</th>
                        <th className="text-right py-2 pr-4 font-semibold" style={{ color: '#8A8A80' }}>AI Call</th>
                        <th className="text-right py-2 font-semibold" style={{ color: '#8A8A80' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentExecutions.map((exec) => (
                        <tr
                          key={exec.id}
                          style={{ borderBottom: '1px solid #F0EAE0' }}
                        >
                          <td className="py-2 pr-4" style={{ color: '#8A8A80' }}>
                            {new Date(exec.createdAt).toLocaleTimeString('en-US')}
                          </td>
                          <td className="py-2 pr-4 font-mono" style={{ color: '#1F2421' }}>
                            {exec.ticketId || '—'}
                          </td>
                          <td className="py-2 pr-4">
                            <span
                              className="px-2 py-0.5 rounded-full text-xs font-medium"
                              style={{
                                background: exec.classification === 'auto' ? '#D1FAE5'
                                  : exec.classification === 'draft' ? '#FEF3C7'
                                  : exec.classification === 'escalate' ? '#FEE2E2'
                                  : '#F3F4F6',
                                color: exec.classification === 'auto' ? '#065F46'
                                  : exec.classification === 'draft' ? '#92400E'
                                  : exec.classification === 'escalate' ? '#991B1B'
                                  : '#374151',
                              }}
                            >
                              {exec.classification}
                            </span>
                          </td>
                          <td className="py-2 pr-4">
                            <span
                              className="px-2 py-0.5 rounded-full text-xs font-medium"
                              style={{
                                background: exec.status === 'success' ? '#D1FAE5'
                                  : exec.status === 'degraded' ? '#FEF3C7'
                                  : '#FEE2E2',
                                color: exec.status === 'success' ? '#065F46'
                                  : exec.status === 'degraded' ? '#92400E'
                                  : '#991B1B',
                              }}
                            >
                              {exec.status}
                            </span>
                          </td>
                          <td className="py-2 pr-4 text-right font-mono" style={{ color: '#8A8A80' }}>
                            {exec.aiCallTimeMs > 0 ? `${exec.aiCallTimeMs.toLocaleString()}ms` : '—'}
                          </td>
                          <td className="py-2 text-right font-mono font-semibold" style={{
                            color: exec.executionTimeMs > 10000 ? '#C8853F'
                              : exec.executionTimeMs > 5000 ? '#92400E'
                              : '#1F2421'
                          }}>
                            {exec.executionTimeMs > 0 ? `${exec.executionTimeMs.toLocaleString()}ms` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </div>
          )}
        </section>

        {/* 3. 成功率监控 (Reliability) */}
        <section
          className="p-6 rounded-xl shadow-sm"
          style={{ background: '#FFFFFF', border: '1px solid #E2D9C8' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div
              className="px-3 py-1 rounded-full text-xs font-semibold"
              style={{ background: '#F0E3D0', color: '#C8853F' }}
            >
              Reliability
            </div>
            <span className="text-sm font-medium" style={{ color: '#8A8A80' }}>Success Rate</span>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs mb-2" style={{ color: '#8A8A80' }}>Overall Success Rate (24h)</p>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-bold" style={{ color: '#1F2421' }}>
                  {summary.successRatePct.toFixed(1)}%
                </p>
                <p className="text-sm" style={{ color: '#8A8A80' }}>
                  {summary.totalExecutions24h} executions
                </p>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span style={{ color: '#8A8A80' }}>Auto Rate</span>
                  <span style={{ color: '#1F2421' }}>
                    {totalClassifications > 0
                      ? ((summary.autoCount / totalClassifications) * 100).toFixed(1)
                      : 0}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: '#8A8A80' }}>Draft Rate</span>
                  <span style={{ color: '#1F2421' }}>
                    {totalClassifications > 0
                      ? ((summary.draftCount / totalClassifications) * 100).toFixed(1)
                      : 0}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: '#8A8A80' }}>Escalate Rate</span>
                  <span style={{ color: '#1F2421' }}>
                    {totalClassifications > 0
                      ? ((summary.escalateCount / totalClassifications) * 100).toFixed(1)
                      : 0}%
                  </span>
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs mb-2" style={{ color: '#8A8A80' }}>Degradation Rate (Handle AI Error branch)</p>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-bold" style={{ color: summary.degradationRatePct > 5 ? '#C8853F' : '#1F2421' }}>
                  {summary.degradationRatePct.toFixed(1)}%
                </p>
                {summary.degradationRatePct > 5 && (
                  <span className="text-xs px-2 py-1 rounded" style={{ background: '#F0E3D0', color: '#C8853F' }}>
                    ⚠️ High
                  </span>
                )}
              </div>
              <p className="text-xs mt-2" style={{ color: '#8A8A80' }}>
                Reflects AI service quality, should be &lt; 5%
              </p>
            </div>
          </div>

          {/* Reliability breakdown dropdown */}
          {recentExecutions && recentExecutions.length > 0 && (
            <div className="mt-5 pt-4 border-t" style={{ borderColor: '#E2D9C8' }}>
              <details className="group">
                <summary
                  className="flex items-center gap-2 cursor-pointer text-xs font-semibold select-none"
                  style={{ color: '#8A8A80' }}
                >
                  <span className="transition-transform group-open:rotate-90 inline-block">▶</span>
                  Execution Breakdown ({recentExecutions.length} records, last 24h) &mdash;{' '}
                  <span style={{ color: '#065F46' }}>
                    {recentExecutions.filter(e => e.status === 'success').length} success
                  </span>
                  {recentExecutions.filter(e => e.status === 'degraded').length > 0 && (
                    <span style={{ color: '#92400E' }}>
                      &nbsp;· {recentExecutions.filter(e => e.status === 'degraded').length} degraded
                    </span>
                  )}
                  {recentExecutions.filter(e => e.status === 'failed').length > 0 && (
                    <span style={{ color: '#991B1B' }}>
                      &nbsp;· {recentExecutions.filter(e => e.status === 'failed').length} failed
                    </span>
                  )}
                </summary>
                <div className="mt-3 max-h-72 overflow-y-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr style={{ borderBottom: '1px solid #E2D9C8' }}>
                        <th className="text-left py-2 pr-4 font-semibold" style={{ color: '#8A8A80' }}>Time</th>
                        <th className="text-left py-2 pr-4 font-semibold" style={{ color: '#8A8A80' }}>Ticket ID</th>
                        <th className="text-left py-2 pr-4 font-semibold" style={{ color: '#8A8A80' }}>Status</th>
                        <th className="text-left py-2 pr-4 font-semibold" style={{ color: '#8A8A80' }}>Classification</th>
                        <th className="text-left py-2 pr-4 font-semibold" style={{ color: '#8A8A80' }}>Risk</th>
                        <th className="text-right py-2 font-semibold" style={{ color: '#8A8A80' }}>Total Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentExecutions.map((exec) => (
                        <tr
                          key={exec.id}
                          style={{
                            borderBottom: '1px solid #F0EAE0',
                            background: exec.status === 'degraded' ? '#FFFBEB'
                              : exec.status === 'failed' ? '#FFF5F5'
                              : 'transparent',
                          }}
                        >
                          <td className="py-2 pr-4" style={{ color: '#8A8A80' }}>
                            {new Date(exec.createdAt).toLocaleTimeString('en-US')}
                          </td>
                          <td className="py-2 pr-4 font-mono" style={{ color: '#1F2421' }}>
                            {exec.ticketId || '—'}
                          </td>
                          <td className="py-2 pr-4">
                            <span
                              className="px-2 py-0.5 rounded-full text-xs font-medium"
                              style={{
                                background: exec.status === 'success' ? '#D1FAE5'
                                  : exec.status === 'degraded' ? '#FEF3C7'
                                  : '#FEE2E2',
                                color: exec.status === 'success' ? '#065F46'
                                  : exec.status === 'degraded' ? '#92400E'
                                  : '#991B1B',
                              }}
                            >
                              {exec.status}
                            </span>
                          </td>
                          <td className="py-2 pr-4">
                            <span
                              className="px-2 py-0.5 rounded-full text-xs font-medium"
                              style={{
                                background: exec.classification === 'auto' ? '#D1FAE5'
                                  : exec.classification === 'draft' ? '#FEF3C7'
                                  : exec.classification === 'escalate' ? '#FEE2E2'
                                  : '#F3F4F6',
                                color: exec.classification === 'auto' ? '#065F46'
                                  : exec.classification === 'draft' ? '#92400E'
                                  : exec.classification === 'escalate' ? '#991B1B'
                                  : '#374151',
                              }}
                            >
                              {exec.classification}
                            </span>
                          </td>
                          <td className="py-2 pr-4">
                            <span
                              className="px-2 py-0.5 rounded-full text-xs font-medium"
                              style={{
                                background: exec.riskLevel === 'high' ? '#FEE2E2'
                                  : exec.riskLevel === 'medium' ? '#FEF3C7'
                                  : '#F3F4F6',
                                color: exec.riskLevel === 'high' ? '#991B1B'
                                  : exec.riskLevel === 'medium' ? '#92400E'
                                  : '#374151',
                              }}
                            >
                              {exec.riskLevel}
                            </span>
                          </td>
                          <td className="py-2 text-right font-mono font-semibold" style={{
                            color: exec.executionTimeMs > 10000 ? '#C8853F'
                              : exec.executionTimeMs > 5000 ? '#92400E'
                              : '#1F2421'
                          }}>
                            {exec.executionTimeMs > 0 ? `${exec.executionTimeMs.toLocaleString()}ms` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </div>
          )}
        </section>

        {/* 4. 错误监控 (Error Tracking) */}
        <section
          className="p-6 rounded-xl shadow-sm"
          style={{ background: '#FFFFFF', border: '1px solid #E2D9C8' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div
              className="px-3 py-1 rounded-full text-xs font-semibold"
              style={{ background: '#F0E3D0', color: '#C8853F' }}
            >
              Error Tracking
            </div>
            <span className="text-sm font-medium" style={{ color: '#8A8A80' }}>Failure Analysis</span>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center pb-2 border-b" style={{ borderColor: '#E2D9C8' }}>
              <span className="text-xs font-semibold" style={{ color: '#8A8A80' }}>Recent Errors (24h)</span>
              <span className="text-xs" style={{ color: '#8A8A80' }}>{recentErrors.length} errors</span>
            </div>
            {recentErrors.length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: '#8A8A80' }}>
                ✅ No errors recorded
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {recentErrors.map((err) => {
                  // executionUrl stored in details by error handler
                  const executionUrl = err.details?.executionUrl || (
                    err.n8nExecutionId && err.n8nWorkflowId
                      ? `https://n8n-production-fee8.up.railway.app/workflow/${err.n8nWorkflowId}/executions/${err.n8nExecutionId}`
                      : null
                  );
                  // n8n execution ID display: prefer numeric-looking ID
                  const displayExecId = err.n8nExecutionId
                    ? (String(err.n8nExecutionId).match(/^\d+$/) ? `#${err.n8nExecutionId}` : err.n8nExecutionId)
                    : null;

                  return (
                    <div
                      key={err.id}
                      className="p-3 rounded-lg text-xs"
                      style={{ background: '#FBF7EF', border: '1px solid #E2D9C8' }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="font-semibold mb-1" style={{ color: '#C8853F' }}>
                            {err.errorMsg || 'Unknown error'}
                          </div>
                          <div className="flex items-center gap-3 text-xs" style={{ color: '#8A8A80' }}>
                            <span>{new Date(err.createdAt).toLocaleString('en-US')}</span>
                            {err.ticketId && err.ticketId !== 'N/A' && (
                              <span className="font-mono">Ticket: {err.ticketId}</span>
                            )}
                            {displayExecId && (
                              <span className="font-mono font-semibold" style={{ color: '#C8853F' }}>
                                {displayExecId}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* n8n execution details */}
                      <div className="grid grid-cols-2 gap-2 py-2 border-t border-b my-2" style={{ borderColor: '#E2D9C8' }}>
                        <div>
                          <span className="font-semibold" style={{ color: '#8A8A80' }}>Workflow:</span>
                          <span className="ml-1" style={{ color: '#1F2421' }}>
                            {err.n8nWorkflowName || 'shopify-support-handler'}
                          </span>
                        </div>
                        <div>
                          <span className="font-semibold" style={{ color: '#8A8A80' }}>Failed Node:</span>
                          <span className="ml-1 font-mono" style={{ color: '#C8853F' }}>
                            {err.failedNode || 'AI Agent'}
                          </span>
                        </div>
                        {displayExecId && (
                          <>
                            <div className="col-span-2">
                              <span className="font-semibold" style={{ color: '#8A8A80' }}>Execution ID:</span>
                              <span className="ml-1 font-mono text-xs" style={{ color: '#1F2421' }}>
                                {displayExecId}
                              </span>
                            </div>
                            {executionUrl && (
                              <div className="col-span-2">
                                <a
                                  href={executionUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs font-semibold hover:underline"
                                  style={{ color: '#C8853F' }}
                                >
                                  🔗 View in n8n →
                                </a>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {err.details && (
                        <details className="mt-2">
                          <summary className="cursor-pointer font-semibold" style={{ color: '#8A8A80' }}>
                            Raw Details
                          </summary>
                          <pre className="text-xs mt-1 overflow-x-auto p-2 rounded" style={{ color: '#8A8A80', background: '#FFFFFF' }}>
                            {JSON.stringify(err.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* 5. 业务指标 (Business Metrics) */}
        <section
          className="p-6 rounded-xl shadow-sm"
          style={{ background: '#FFFFFF', border: '1px solid #E2D9C8' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div
              className="px-3 py-1 rounded-full text-xs font-semibold"
              style={{ background: '#F0E3D0', color: '#C8853F' }}
            >
              Business Metrics
            </div>
            <span className="text-sm font-medium" style={{ color: '#8A8A80' }}>Volume & Classification</span>
          </div>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-xs mb-2" style={{ color: '#8A8A80' }}>Classification Distribution (24h)</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: '#34D399' }}></div>
                  <span className="text-sm" style={{ color: '#1F2421' }}>Auto: {summary.autoCount}</span>
                  <span className="text-xs ml-auto" style={{ color: '#8A8A80' }}>
                    {totalClassifications > 0
                      ? ((summary.autoCount / totalClassifications) * 100).toFixed(1)
                      : 0}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: '#FBBF24' }}></div>
                  <span className="text-sm" style={{ color: '#1F2421' }}>Draft: {summary.draftCount}</span>
                  <span className="text-xs ml-auto" style={{ color: '#8A8A80' }}>
                    {totalClassifications > 0
                      ? ((summary.draftCount / totalClassifications) * 100).toFixed(1)
                      : 0}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: '#EF4444' }}></div>
                  <span className="text-sm" style={{ color: '#1F2421' }}>Escalate: {summary.escalateCount}</span>
                  <span className="text-xs ml-auto" style={{ color: '#8A8A80' }}>
                    {totalClassifications > 0
                      ? ((summary.escalateCount / totalClassifications) * 100).toFixed(1)
                      : 0}%
                  </span>
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs mb-2" style={{ color: '#8A8A80' }}>Ticket Volume</p>
              <p className="text-2xl font-bold" style={{ color: '#1F2421' }}>
                {summary.totalExecutions24h}
                <span className="text-sm font-normal ml-1" style={{ color: '#8A8A80' }}>/ 24h</span>
              </p>
              <p className="text-xs mt-2" style={{ color: '#8A8A80' }}>
                Avg {(summary.totalExecutions24h / 24).toFixed(1)} per hour
              </p>
            </div>
            <div>
              <p className="text-xs mb-2" style={{ color: '#8A8A80' }}>Human Intervention Rate</p>
              <p className="text-2xl font-bold" style={{ color: '#1F2421' }}>
                {totalClassifications > 0
                  ? (((summary.draftCount + summary.escalateCount) / totalClassifications) * 100).toFixed(1)
                  : 0}%
              </p>
              <p className="text-xs mt-2" style={{ color: '#8A8A80' }}>
                needs_review status share
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
