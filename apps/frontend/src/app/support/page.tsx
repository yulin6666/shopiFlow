'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import SupportChat from '@/components/support/SupportChat';
import QuestionList from '@/components/support/QuestionList';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

export default function SupportPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [showQuestions, setShowQuestions] = useState(false);
  const [showInitPanel, setShowInitPanel] = useState(false);
  const chatInputRef = useRef<{ sendMessage: (text: string) => void }>(null);

  const handleSelectQuestion = (question: string) => {
    chatInputRef.current?.sendMessage(question);
  };

  const handleLoadData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_N8N_WEBHOOK_BASE_URL}/webhook/data-init`, {
        method: 'POST',
      });

      if (!res.ok) throw new Error('Failed to load data');

      const data = await res.json();
      console.log('Data loaded:', data);
      setDataLoaded(true);
      setShowInitPanel(false);
    } catch (error) {
      console.error('Load data error:', error);
      alert('Failed to load demo data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold text-gray-900 hover:text-emerald-600">
            ← ShopiFow AI Demo
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowInitPanel(!showInitPanel)}
              className="text-xs px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors"
            >
              {dataLoaded ? '✓ Data Loaded' : '⚙️ Initialize KB'}
            </button>
            <Link href="/reviews">
              <Button variant="secondary" size="sm">
                ⭐ Review Replies
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">AI Support Chat</h1>
          <p className="text-gray-600">
            Ask questions about products, orders, shipping, or returns — AI retrieves context and responds intelligently
          </p>
        </div>

        {/* Init panel (collapsible) */}
        {showInitPanel && (
          <Card className="p-6 bg-emerald-50 border-emerald-100">
            <h3 className="font-semibold text-gray-900 mb-2">Initialize Knowledge Base</h3>
            <p className="text-sm text-gray-600 mb-4">
              Loads product catalog, order history, and FAQs into Pinecone. Combines real Shopify data with demo data for Amazon and TikTok Shop.
            </p>
            <Button onClick={handleLoadData} loading={isLoading} disabled={dataLoaded} size="sm">
              {dataLoaded ? '✓ Data Loaded' : 'Load Demo Data'}
            </Button>
            <p className="text-xs text-gray-500 mt-2">
              Safe to run multiple times — Pinecone upsert overwrites existing records
            </p>
          </Card>
        )}

        {/* Gorgias integration note */}
        <Card className="p-4 bg-purple-50 border-purple-100">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <div className="text-sm text-purple-900 space-y-1">
              <p><strong>Real-world integration: Gorgias</strong></p>
              <p className="text-purple-800">
                In production, customer messages from Shopify, Amazon (via ChannelReply), and TikTok Shop flow into <strong>Gorgias</strong> — a unified helpdesk that sends tickets to this AI system via webhook. AI responses are classified and routed back through Gorgias to the original platform.
              </p>
              <p className="text-xs text-purple-700 mt-1">
                💡 This demo simulates that workflow: type any customer question below to see AI classification and response generation in action.
              </p>
            </div>
          </div>
        </Card>

        {/* Chat Interface */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Chat with AI</h2>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowQuestions(!showQuestions)}
            >
              {showQuestions ? 'Hide' : 'Show'} Sample Questions
            </Button>
          </div>

          {showQuestions && (
            <div className="mb-4">
              <QuestionList onSelectQuestion={handleSelectQuestion} />
            </div>
          )}

          <SupportChat ref={chatInputRef} />
        </Card>

        {/* How it works */}
        <Card className="p-6 bg-blue-50 border-blue-100">
          <h3 className="font-semibold text-gray-900 mb-3">💡 How the AI classification works</h3>
          <div className="space-y-3 text-sm text-gray-700">
            <div className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold text-lg">✓</span>
              <div>
                <strong className="text-emerald-700">Auto-reply (70-80% of queries)</strong>
                <p className="text-gray-600 mt-1">Standard questions like "Where is my order?", "What's your return policy?", or product FAQs — AI responds instantly.</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-amber-600 font-bold text-lg">📝</span>
              <div>
                <strong className="text-amber-700">Draft for review</strong>
                <p className="text-gray-600 mt-1">Refunds, complaints, or shipping issues — AI drafts a response, waits for human approval.</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-red-600 font-bold text-lg">⚠️</span>
              <div>
                <strong className="text-red-700">Escalate to human</strong>
                <p className="text-gray-600 mt-1">Health concerns, legal threats, or VIP customers — immediately flagged for manual handling.</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
