import ReviewList from '@/components/reviews/ReviewList';

export default function ReviewsPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Review Reply Generator</h1>
        <p className="text-sm text-gray-500 mt-1">
          AI-generated brand-voice replies for reviews across platforms — with multi-language support
        </p>
      </div>

      {/* Platform note */}
      <div className="mb-5 p-3 bg-amber-50 border border-amber-100 rounded-xl flex gap-3">
        <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xs text-amber-800 leading-relaxed">
          <strong>Amazon note:</strong> Amazon has no official review API — industry standard is importing via Judge.me.
          <strong className="mx-1">TikTok Shop:</strong> official API has limited review access.
          This demo uses mock data; the AI reply layer is platform-agnostic.
        </p>
      </div>

      <ReviewList />
    </div>
  );
}
