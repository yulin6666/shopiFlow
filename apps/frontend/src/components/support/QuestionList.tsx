'use client';

import { useState } from 'react';

interface QuestionCategory {
  title: string;
  questions: string[];
  badge?: 'auto' | 'draft' | 'escalate';
}

const QUESTION_CATEGORIES: QuestionCategory[] = [
  {
    title: 'Product Inquiries',
    questions: [
      'List all NIKE products',
      'Do you have any ADIDAS backpacks?',
      'Is the NIKE TODDLER ROSHE ONE in stock?',
      'How much does the ADIDAS CLASSIC BACKPACK cost?',
      'Tell me more about the ADIDAS CLASSIC BACKPACK',
    ],
    badge: 'auto',
  },
  {
    title: 'Order Status & Tracking',
    questions: [
      "What's the status of order #1180?",
      'Where is my order?',
      "What's the tracking number for order #1180?",
      'Show me details of order 1180',
    ],
    badge: 'auto',
  },
  {
    title: 'Returns & Refunds',
    questions: [
      "What's your return policy?",
      'How long do I have to return an item?',
      'I want to return order #1180',
      'Can I get a refund for my order?',
    ],
    badge: 'draft',
  },
  {
    title: 'Shipping',
    questions: [
      'What are your shipping options?',
      'Do you offer free shipping?',
      'Can I change my shipping address?',
      'Do you ship internationally?',
    ],
    badge: 'auto',
  },
  {
    title: 'Payment & Discounts',
    questions: [
      'Do you have any discount codes?',
      'Is there a sale going on?',
      'My payment was charged twice',
      'I want to dispute this charge',
    ],
    badge: 'escalate',
  },
  {
    title: 'Order Modifications',
    questions: [
      'Can I add more items to my order?',
      'I want to cancel order #1180',
      'Can I change the size I ordered?',
    ],
    badge: 'draft',
  },
];

function getBadgeStyle(badge?: 'auto' | 'draft' | 'escalate') {
  switch (badge) {
    case 'auto':
      return 'bg-emerald-100 text-emerald-700';
    case 'draft':
      return 'bg-amber-100 text-amber-700';
    case 'escalate':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

interface QuestionListProps {
  onSelectQuestion: (question: string) => void;
}

export default function QuestionList({ onSelectQuestion }: QuestionListProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set([0]));

  const toggleCategory = (index: number) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <div className="border border-gray-200 rounded-lg bg-white">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-700">Sample Questions</h3>
        <p className="text-xs text-gray-500 mt-0.5">Click to test different scenarios</p>
      </div>

      <div className="divide-y divide-gray-200">
        {QUESTION_CATEGORIES.map((category, idx) => (
          <div key={idx}>
            <button
              onClick={() => toggleCategory(idx)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">{category.title}</span>
                {category.badge && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getBadgeStyle(category.badge)}`}>
                    {category.badge === 'auto' ? 'Auto' : category.badge === 'draft' ? 'Draft' : 'Escalate'}
                  </span>
                )}
              </div>
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform ${expandedCategories.has(idx) ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {expandedCategories.has(idx) && (
              <div className="px-4 pb-3 space-y-1">
                {category.questions.map((question, qIdx) => (
                  <button
                    key={qIdx}
                    onClick={() => onSelectQuestion(question)}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 rounded hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                  >
                    {question}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
