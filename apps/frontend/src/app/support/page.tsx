'use client';

import { useState } from 'react';
import SupportChat from '@/components/support/SupportChat';
import GorgiasTicketList from '@/components/support/GorgiasTicketList';
import Card from '@/components/ui/Card';

type Tab = 'demo' | 'gorgias';

export default function SupportPage() {
  const [tab, setTab] = useState<Tab>('demo');

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">Support Chat</h1>
        <p className="text-sm text-gray-500 mt-1">
          AI-first support across Shopify, Amazon, and TikTok Shop — with escalation paths for edge cases
        </p>
      </div>

      {/* Escalation legend */}
      <div className="flex gap-4 mb-5 flex-wrap">
        {[
          { color: 'bg-green-500', label: 'Auto-replied', desc: '~70-80% of tickets' },
          { color: 'bg-yellow-500', label: 'Draft for review', desc: 'Refunds, complaints' },
          { color: 'bg-red-500', label: 'Escalated to human', desc: 'Health, legal, high-value' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-xs">
            <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
            <span className="font-medium text-gray-700">{item.label}</span>
            <span className="text-gray-400">· {item.desc}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-4 w-fit">
        <button
          onClick={() => setTab('demo')}
          className={`px-4 py-2 rounded-md text-xs font-medium transition-colors ${
            tab === 'demo' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Demo Chat
        </button>
        <button
          onClick={() => setTab('gorgias')}
          className={`px-4 py-2 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
            tab === 'gorgias' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Live Tickets
          <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">Gorgias</span>
        </button>
      </div>

      {tab === 'demo' && (
        <>
          <Card className="h-[680px] flex flex-col" padding="lg">
            <SupportChat />
          </Card>
          <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <p className="text-xs font-semibold text-blue-800 mb-1">How it works</p>
            <p className="text-xs text-blue-700 leading-relaxed">
              Messages hit the Next.js API route which calls the n8n webhook. The n8n LangChain agent
              queries Pinecone for relevant order context, then calls Claude via OpenRouter to classify
              and generate a response. If n8n is unavailable the API falls back to direct OpenRouter.
            </p>
          </div>
        </>
      )}

      {tab === 'gorgias' && (
        <>
          <Card padding="lg">
            <GorgiasTicketList />
          </Card>
          <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <p className="text-xs font-semibold text-blue-800 mb-1">Architecture</p>
            <p className="text-xs text-blue-700 leading-relaxed">
              Real Gorgias tickets are fetched via REST API. Click "Classify with AI →" to run
              the escalation logic. For AUTO/DRAFT tickets you can edit and send the reply back
              through Gorgias directly. Replies show up in the original Shopify/Amazon/TikTok
              conversation via Gorgias native integrations.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
