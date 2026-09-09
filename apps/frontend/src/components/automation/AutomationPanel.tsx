'use client';

import { useState } from 'react';
import { AutomationWorkflow, WorkflowStatus } from '@/types';
import { WORKFLOW_DESCRIPTIONS } from '@/lib/prompts';
import Card, { CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';

const initialWorkflows: AutomationWorkflow[] = [
  {
    id: 'order-sync',
    name: WORKFLOW_DESCRIPTIONS.orderSync.name,
    description: WORKFLOW_DESCRIPTIONS.orderSync.description,
    trigger: WORKFLOW_DESCRIPTIONS.orderSync.trigger,
    steps: WORKFLOW_DESCRIPTIONS.orderSync.steps.map((s) => ({ ...s, status: 'idle' })),
    status: 'idle',
    stats: { totalRuns: 168, successRate: 99.4, avgDuration: '3.2s' },
  },
  {
    id: 'support-chat',
    name: WORKFLOW_DESCRIPTIONS.supportChat.name,
    description: WORKFLOW_DESCRIPTIONS.supportChat.description,
    trigger: WORKFLOW_DESCRIPTIONS.supportChat.trigger,
    steps: WORKFLOW_DESCRIPTIONS.supportChat.steps.map((s) => ({ ...s, status: 'idle' })),
    status: 'idle',
    stats: { totalRuns: 1247, successRate: 97.8, avgDuration: '2.1s' },
  },
  {
    id: 'review-reply',
    name: WORKFLOW_DESCRIPTIONS.reviewReply.name,
    description: WORKFLOW_DESCRIPTIONS.reviewReply.description,
    trigger: WORKFLOW_DESCRIPTIONS.reviewReply.trigger,
    steps: WORKFLOW_DESCRIPTIONS.reviewReply.steps.map((s) => ({ ...s, status: 'idle' })),
    status: 'idle',
    stats: { totalRuns: 342, successRate: 98.5, avgDuration: '1.8s' },
  },
];

const statusColors: Record<WorkflowStatus, string> = {
  idle: 'bg-gray-100 text-gray-600',
  running: 'bg-blue-100 text-blue-700',
  success: 'bg-green-100 text-green-700',
  error: 'bg-red-100 text-red-700',
};

const stepStatusIcon = (status: WorkflowStatus) => {
  if (status === 'idle') return <span className="w-5 h-5 rounded-full border-2 border-gray-300 inline-block" />;
  if (status === 'running') return <span className="w-5 h-5 rounded-full border-2 border-blue-400 border-t-transparent animate-spin inline-block" />;
  if (status === 'success') return (
    <span className="w-5 h-5 rounded-full bg-green-500 inline-flex items-center justify-center">
      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
      </svg>
    </span>
  );
  return (
    <span className="w-5 h-5 rounded-full bg-red-500 inline-flex items-center justify-center">
      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </span>
  );
};

export default function AutomationPanel() {
  const [workflows, setWorkflows] = useState<AutomationWorkflow[]>(initialWorkflows);

  const simulateRun = async (workflowId: string) => {
    // Animate steps one by one
    setWorkflows((prev) =>
      prev.map((w) =>
        w.id === workflowId
          ? { ...w, status: 'running', steps: w.steps.map((s) => ({ ...s, status: 'idle' })) }
          : w,
      ),
    );

    const workflow = workflows.find((w) => w.id === workflowId);
    if (!workflow) return;

    for (let i = 0; i < workflow.steps.length; i++) {
      await new Promise((r) => setTimeout(r, 700));
      setWorkflows((prev) =>
        prev.map((w) =>
          w.id === workflowId
            ? {
                ...w,
                steps: w.steps.map((s, idx) => ({
                  ...s,
                  status: idx < i ? 'success' : idx === i ? 'running' : 'idle',
                })),
              }
            : w,
        ),
      );
    }

    await new Promise((r) => setTimeout(r, 700));
    setWorkflows((prev) =>
      prev.map((w) =>
        w.id === workflowId
          ? {
              ...w,
              status: 'success',
              lastRun: new Date().toISOString(),
              steps: w.steps.map((s) => ({ ...s, status: 'success' })),
              stats: { ...w.stats, totalRuns: w.stats.totalRuns + 1 },
            }
          : w,
      ),
    );
  };

  return (
    <div className="space-y-5">
      {/* Architecture diagram */}
      <Card className="bg-gray-900 text-white border-gray-800">
        <CardHeader>
          <CardTitle className="text-gray-100">Automation Architecture</CardTitle>
          <span className="text-xs text-gray-400">Shopify + n8n + Pinecone + OpenRouter</span>
        </CardHeader>
        <div className="font-mono text-xs text-gray-300 leading-relaxed space-y-1">
          <p>Shopify ─────────────────────────────────────┐</p>
          <p>TikTok Shop ── Gorgias webhook ──────────────┼→ n8n Agent → OpenRouter Claude</p>
          <p>Amazon ────── ChannelReply → Gorgias ────────┘         ↕</p>
          <p className="pt-1 text-green-400">{'                                          Pinecone (order vectors)'}</p>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { label: 'n8n', desc: 'Self-hosted orchestration', color: 'text-orange-400' },
            { label: 'Pinecone', desc: 'Vector search for orders', color: 'text-purple-400' },
            { label: 'OpenRouter', desc: 'Claude via unified API', color: 'text-blue-400' },
          ].map((item) => (
            <div key={item.label} className="p-3 bg-gray-800 rounded-lg">
              <p className={`text-xs font-semibold ${item.color}`}>{item.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Workflow cards */}
      {workflows.map((workflow) => (
        <Card key={workflow.id}>
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-gray-900">{workflow.name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[workflow.status]}`}>
                  {workflow.status}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{workflow.description}</p>
              <p className="text-xs text-gray-400 mt-1">
                <span className="font-medium">Trigger:</span> {workflow.trigger}
              </p>
            </div>
            <Button
              size="sm"
              variant={workflow.status === 'running' ? 'secondary' : 'primary'}
              disabled={workflow.status === 'running'}
              loading={workflow.status === 'running'}
              onClick={() => simulateRun(workflow.id)}
            >
              {workflow.status === 'running' ? 'Running...' : 'Simulate Run'}
            </Button>
          </div>

          {/* Steps */}
          <div className="flex items-center gap-2 my-3">
            {workflow.steps.map((step, idx) => (
              <div key={step.id} className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  {stepStatusIcon(step.status)}
                  <div>
                    <p className="text-xs font-medium text-gray-700">{step.name}</p>
                    <p className="text-xs text-gray-400">{step.description}</p>
                  </div>
                </div>
                {idx < workflow.steps.length - 1 && (
                  <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="flex gap-4 pt-3 border-t border-gray-100">
            <div>
              <p className="text-xs text-gray-400">Total runs</p>
              <p className="text-sm font-semibold text-gray-900">{workflow.stats.totalRuns.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Success rate</p>
              <p className="text-sm font-semibold text-green-600">{workflow.stats.successRate}%</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Avg duration</p>
              <p className="text-sm font-semibold text-gray-900">{workflow.stats.avgDuration}</p>
            </div>
            {workflow.lastRun && (
              <div>
                <p className="text-xs text-gray-400">Last run</p>
                <p className="text-sm font-semibold text-gray-900">
                  {new Date(workflow.lastRun).toLocaleTimeString()}
                </p>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
