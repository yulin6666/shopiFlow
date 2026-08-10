'use client';

import { useState, useEffect } from 'react';
import { Review, ReviewPlatform } from '@/types';
import { getPlatformColor, getRatingStars, formatDate } from '@/lib/utils';
import Button from '@/components/ui/Button';

const LANGUAGE_OPTIONS = [
  { value: 'same', label: 'Same as review' },
  { value: 'en', label: 'English' },
  { value: 'zh', label: 'Chinese' },
  { value: 'es', label: 'Spanish' },
  { value: 'ja', label: 'Japanese' },
  { value: 'de', label: 'German' },
];

export default function ReviewList() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [source, setSource] = useState<'judgeme' | 'mock' | 'loading'>('loading');
  const [warning, setWarning] = useState<string | null>(null);
  const [filterPlatform, setFilterPlatform] = useState<ReviewPlatform | 'all'>('all');
  const [replyLanguage, setReplyLanguage] = useState('same');
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/reviews')
      .then((r) => r.json())
      .then((data) => {
        setReviews(data.reviews ?? []);
        setSource(data.source ?? 'mock');
        setWarning(data.warning ?? null);
      })
      .catch(() => {
        setSource('mock');
      });
  }, []);

  const filtered =
    filterPlatform === 'all' ? reviews : reviews.filter((r) => r.platform === filterPlatform);

  const generateReply = async (review: Review) => {
    setGeneratingId(review.id);
    setReviews((prev) => prev.map((r) => (r.id === review.id ? { ...r, status: 'generating' } : r)));

    const targetLanguage = replyLanguage === 'same' ? undefined : replyLanguage;

    try {
      const response = await fetch('/api/ai/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: review.platform,
          rating: review.rating,
          content: review.content,
          productName: review.productName,
          language: review.language,
          targetLanguage,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Request failed');

      setReviews((prev) =>
        prev.map((r) =>
          r.id === review.id ? { ...r, generatedReply: data.reply, status: 'replied' } : r,
        ),
      );
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      setReviews((prev) =>
        prev.map((r) =>
          r.id === review.id ? { ...r, status: 'pending', generatedReply: `Error: ${errMsg}` } : r,
        ),
      );
    } finally {
      setGeneratingId(null);
    }
  };

  const generateAll = async () => {
    const pending = filtered.filter((r) => r.status === 'pending');
    for (const review of pending) {
      await generateReply(review);
    }
  };

  const pendingCount = filtered.filter((r) => r.status === 'pending').length;

  if (source === 'loading') {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
        Loading reviews...
      </div>
    );
  }

  return (
    <div>
      {/* Data source banner */}
      <div className={`flex items-center gap-2 mb-4 px-3 py-2 rounded-lg text-xs ${
        source === 'judgeme'
          ? 'bg-green-50 border border-green-100 text-green-800'
          : 'bg-amber-50 border border-amber-100 text-amber-800'
      }`}>
        <span className={`w-2 h-2 rounded-full ${source === 'judgeme' ? 'bg-green-500' : 'bg-amber-400'}`} />
        {source === 'judgeme'
          ? `Live data from Judge.me (${reviews.length} reviews)`
          : 'Demo data — connect Judge.me to see real reviews'}
        {warning && <span className="ml-2 text-amber-600">· {warning}</span>}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(['all', 'shopify', 'amazon', 'tiktok'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setFilterPlatform(p)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filterPlatform === p
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {p === 'all' ? `All (${reviews.length})` : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Reply language:</label>
          <select
            value={replyLanguage}
            onChange={(e) => setReplyLanguage(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700"
          >
            {LANGUAGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <Button
          onClick={generateAll}
          size="sm"
          disabled={pendingCount === 0 || generatingId !== null}
          loading={generatingId !== null}
          className="ml-auto"
        >
          Generate All ({pendingCount} pending)
        </Button>
      </div>

      {/* Review cards */}
      <div className="space-y-4">
        {filtered.map((review) => (
          <ReviewCard
            key={review.id}
            review={review}
            isGenerating={generatingId === review.id}
            onGenerate={() => generateReply(review)}
          />
        ))}
      </div>
    </div>
  );
}

function ReviewCard({
  review,
  isGenerating,
  onGenerate,
}: {
  review: Review;
  isGenerating: boolean;
  onGenerate: () => void;
}) {
  const [showReply, setShowReply] = useState(true);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getPlatformColor(review.platform)}`}>
              {review.platform}
            </span>
            <span className="text-yellow-400 text-sm">{getRatingStars(review.rating)}</span>
            <span className="text-xs text-gray-400">{formatDate(review.date)}</span>
          </div>
          <p className="text-sm font-semibold text-gray-900 mt-1">{review.title}</p>
          <p className="text-xs text-gray-500 mt-0.5">by {review.author} · {review.productName}</p>
        </div>
        <div className="flex-shrink-0">
          {review.status !== 'replied' ? (
            <Button size="sm" variant="secondary" onClick={onGenerate} loading={isGenerating}>
              {isGenerating ? 'Generating...' : 'Generate Reply'}
            </Button>
          ) : (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
              Reply ready
            </span>
          )}
        </div>
      </div>

      <p className="text-sm text-gray-600 leading-relaxed border-l-2 border-gray-200 pl-3">
        {review.content}
      </p>

      {review.generatedReply && (
        <div className="mt-3 p-3 bg-green-50 border border-green-100 rounded-lg">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-semibold text-green-800">AI Reply</p>
            <button
              onClick={() => setShowReply(!showReply)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              {showReply ? 'Hide' : 'Show'}
            </button>
          </div>
          {showReply && (
            <>
              <p className="text-sm text-green-900 leading-relaxed">{review.generatedReply}</p>
              <div className="flex gap-2 mt-2">
                <button
                  className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                  onClick={() => navigator.clipboard.writeText(review.generatedReply ?? '')}
                >
                  Copy
                </button>
                <button
                  className="text-xs bg-white border border-green-200 text-green-700 px-3 py-1 rounded hover:bg-green-50"
                  onClick={onGenerate}
                >
                  Regenerate
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
