'use client';

import { useState, useRef } from 'react';
import SupportChat from '@/components/support/SupportChat';
import QuestionList from '@/components/support/QuestionList';
// import GorgiasImportPanel from '@/components/support/GorgiasImportPanel';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [showQuestions, setShowQuestions] = useState(false);
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
    } catch (error) {
      console.error('Load data error:', error);
      alert('Failed to load demo data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-6 space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">AI Support Chat</h1>
          <p className="text-gray-600">
            AI-powered customer support with RAG knowledge base
          </p>
        </div>

        {/* Step 1: Load Knowledge Base */}
        <Card className="max-w-2xl mx-auto">
          <div className="space-y-6 text-center p-8">
            <div className="space-y-2">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 text-2xl font-bold mb-4">
                1
              </div>
              <h2 className="text-2xl font-semibold text-gray-900">
                Initialize Knowledge Base
              </h2>
              <p className="text-gray-600 max-w-md mx-auto">
                Load demo data into Pinecone — Shopify orders/products + Amazon/TikTok/FAQ mock data
              </p>
            </div>

            <Button
              onClick={handleLoadData}
              loading={isLoading}
              size="lg"
              className="px-8"
              disabled={dataLoaded}
            >
              {dataLoaded ? '✓ Data Loaded' : 'Load Demo Data into Pinecone'}
            </Button>

            <p className="text-sm text-gray-500">
              Safe to run multiple times — Pinecone upsert overwrites existing records
            </p>
          </div>
        </Card>

        {/* Step 2: Chat Interface */}
        <div className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 text-lg font-bold">
                  2
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Chat with AI</h2>
                  <p className="text-sm text-gray-500">Ask questions about products and orders</p>
                </div>
              </div>

              <div className="flex gap-2 relative">
              {/* <GorgiasImportPanel
                  onSendMessage={(msg) => chatInputRef.current?.sendMessage(msg)}
                /> */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowQuestions(!showQuestions)}
                >
                  {showQuestions ? 'Hide' : 'Show'} Sample Questions
                </Button>
              </div>
            </div>

            {/* Question List */}
            {showQuestions && (
              <div className="mb-4">
                <QuestionList onSelectQuestion={handleSelectQuestion} />
              </div>
            )}

            {/* Chat */}
            <SupportChat ref={chatInputRef} />
          </Card>

          {/* How it works */}
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-3">How it works</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">→</span>
                <span>AI queries Pinecone vector database for relevant context</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">→</span>
                <span>LLM generates responses using retrieved knowledge</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">→</span>
                <span>Messages auto-classify: <strong className="text-emerald-600">auto-reply</strong>, <strong className="text-amber-600">draft</strong>, or <strong className="text-red-600">escalate</strong></span>
              </div>
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
}
