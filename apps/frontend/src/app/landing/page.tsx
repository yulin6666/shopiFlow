'use client';

import Link from 'next/link';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50">
      <div className="max-w-4xl mx-auto p-6 py-12 space-y-12">
        {/* Hero */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-900">ShopiFow AI Demo</h1>
          <p className="text-xl text-gray-700 max-w-2xl mx-auto">
            Multi-platform customer support automation with AI-first response handling
          </p>
        </div>

        {/* What it does */}
        <Card className="p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">What this demo does</h2>
          <p className="text-gray-700 mb-4">
            Unifies customer support across <strong>Shopify, Amazon, and TikTok Shop</strong> into a single AI-powered workflow.
          </p>
          <p className="text-gray-700">
            AI automatically classifies incoming messages into:
          </p>
          <div className="mt-4 space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-emerald-600 font-bold text-xl">✓</span>
              <div>
                <strong className="text-emerald-700">Auto-reply</strong>
                <span className="text-gray-600"> — Standard FAQs like "Where is my order?" or "What's your return policy?"</span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-amber-600 font-bold text-xl">📝</span>
              <div>
                <strong className="text-amber-700">Draft for review</strong>
                <span className="text-gray-600"> — Refunds, complaints, or shipping issues requiring human approval</span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-red-600 font-bold text-xl">⚠️</span>
              <div>
                <strong className="text-red-700">Escalate to human</strong>
                <span className="text-gray-600"> — Health risks, legal threats, or VIP customers needing immediate manual handling</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Features */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start gap-4">
              <div className="text-3xl">💬</div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Support Chat</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Intelligent customer support powered by RAG (Retrieval-Augmented Generation). AI queries your knowledge base and responds with accurate, context-aware answers.
                </p>
                <Link href="/support">
                  <Button size="sm">Try Support Chat →</Button>
                </Link>
              </div>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start gap-4">
              <div className="text-3xl">⭐</div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Review Reply Generator</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Generate personalized, brand-voice replies for reviews across all platforms. Saves hours of manual work while maintaining consistent quality.
                </p>
                <Link href="/reviews">
                  <Button size="sm">Try Review Replies →</Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>

        {/* Platform integration */}
        <Card className="p-6 bg-purple-50 border-purple-100">
          <h3 className="font-semibold text-gray-900 mb-3">🔗 Real-world integration</h3>
          <div className="space-y-3 text-sm text-gray-700">
            <div>
              <strong className="text-purple-900">Gorgias as unified helpdesk:</strong>
              <p className="text-gray-600 mt-1">
                Customer messages from Shopify, Amazon (via ChannelReply), and TikTok Shop flow into Gorgias. Gorgias sends tickets to this AI system via webhook. AI responses are classified and routed back through Gorgias to the original platform.
              </p>
            </div>
            <div>
              <strong className="text-purple-900">Data sources:</strong>
              <ul className="list-disc list-inside text-gray-600 mt-1 space-y-1 ml-2">
                <li><strong>Shopify:</strong> Direct API access (real data in this demo)</li>
                <li><strong>Amazon:</strong> SP-API for orders (requires seller approval) + ChannelReply for messages</li>
                <li><strong>TikTok Shop:</strong> Official API (requires app approval)</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Tech stack */}
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-3">🔧 Technical Architecture</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-700">
            <div>
              <strong>Frontend:</strong>
              <p className="text-gray-600">Next.js 14 (App Router)</p>
            </div>
            <div>
              <strong>AI:</strong>
              <p className="text-gray-600">Claude 4.6 via OpenRouter</p>
            </div>
            <div>
              <strong>Vector DB:</strong>
              <p className="text-gray-600">Pinecone (embeddings via OpenAI)</p>
            </div>
            <div>
              <strong>Workflow:</strong>
              <p className="text-gray-600">n8n (self-hosted automation)</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
