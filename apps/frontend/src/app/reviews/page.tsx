import Link from 'next/link';
import ReviewList from '@/components/reviews/ReviewList';
import Button from '@/components/ui/Button';

export default function ReviewsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/landing" className="text-lg font-semibold text-gray-900 hover:text-emerald-600">
            ← ShopiFow AI Demo
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/support">
              <Button variant="secondary" size="sm">
                💬 Support Chat
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">AI Review Reply Generator</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Generate personalized, brand-voice replies for customer reviews across Shopify, Amazon, and TikTok Shop — saving hours of manual work while maintaining consistent quality.
        </p>
      </div>

      {/* Platform note */}
      <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl space-y-2">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-amber-900 space-y-1">
            <p><strong>Why this demo uses mock data:</strong></p>
            <ul className="list-disc list-inside space-y-1 text-amber-800 ml-2">
              <li><strong>Amazon:</strong> No official review API. Industry standard is manual CSV import via Judge.me or REVIEWS.io</li>
              <li><strong>TikTok Shop:</strong> Official API has restricted review access; requires app approval</li>
              <li><strong>Shopify:</strong> Review apps like Judge.me provide unified APIs across platforms</li>
            </ul>
            <p className="text-xs text-amber-700 mt-2">
              💡 In production, reviews sync through Judge.me → AI reply generator works the same way regardless of original platform.
            </p>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
        <h3 className="font-semibold text-gray-900 mb-3">💡 How AI reply generation works</h3>
        <div className="space-y-2 text-sm text-gray-700">
          <div className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">1.</span>
            <span>AI analyzes review sentiment, rating, and product context</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">2.</span>
            <span>Generates personalized response in consistent brand voice</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">3.</span>
            <span>All replies in English for consistency (multilingual output available in full version)</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">4.</span>
            <span>Copy-paste ready — or integrate with review platform APIs for one-click publishing</span>
          </div>
        </div>
      </div>

      <ReviewList />
    </div>
    </div>
  );
}
