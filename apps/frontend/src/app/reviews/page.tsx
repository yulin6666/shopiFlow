'use client'

import { useState } from 'react'
import { MOCK_REVIEWS } from '@/lib/reviews'
import { ProductReview } from '@/types'
import { ReviewList } from '@/components/reviews/ReviewList'
import { ReviewDetail } from '@/components/reviews/ReviewDetail'

export default function ReviewsPage() {
  const [selected, setSelected] = useState<ProductReview>(MOCK_REVIEWS[0])

  return (
    <div className="flex h-full">
      {/* Left panel */}
      <div className="w-72 border-r flex flex-col">
        <div className="px-4 py-4 border-b">
          <h1 className="font-semibold text-sm">Review Management</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {MOCK_REVIEWS.length} reviews · AI reply generation
          </p>
        </div>
        <ReviewList
          reviews={MOCK_REVIEWS}
          selected={selected}
          onSelect={setSelected}
        />
      </div>

      {/* Right panel */}
      <div className="flex-1 overflow-auto">
        <ReviewDetail review={selected} />
      </div>
    </div>
  )
}
