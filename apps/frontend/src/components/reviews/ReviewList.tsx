import { ProductReview, ReviewSentiment, ReviewPlatform } from '@/types'
import { Badge } from '@/components/ui/Badge'
import { formatRelativeTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Star, AlertTriangle } from 'lucide-react'

interface ReviewListProps {
  reviews: ProductReview[]
  selected: ProductReview
  onSelect: (r: ProductReview) => void
}

const SENTIMENT_VARIANT: Record<ReviewSentiment, 'success' | 'secondary' | 'destructive'> = {
  positive: 'success',
  neutral: 'secondary',
  negative: 'destructive',
}

const PLATFORM_VARIANT: Record<ReviewPlatform, 'default' | 'warning' | 'outline'> = {
  Shopify: 'default',
  Amazon: 'warning',
  Google: 'outline',
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            'w-3 h-3',
            i <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'
          )}
        />
      ))}
    </div>
  )
}

export function ReviewList({ reviews, selected, onSelect }: ReviewListProps) {
  return (
    <div className="flex-1 overflow-auto">
      {reviews.map((review) => (
        <button
          key={review.id}
          onClick={() => onSelect(review)}
          className={cn(
            'w-full text-left px-4 py-3 border-b transition-colors hover:bg-accent',
            selected.id === review.id && 'bg-primary/5 border-l-2 border-l-primary'
          )}
        >
          <div className="flex items-start justify-between gap-2 mb-1">
            <StarRating rating={review.rating} />
            <div className="flex items-center gap-1">
              {review.isHighPriority && (
                <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />
              )}
              <Badge variant={SENTIMENT_VARIANT[review.sentiment]}>{review.sentiment}</Badge>
            </div>
          </div>
          <p className="text-xs font-medium line-clamp-1 mt-1">{review.customerName}</p>
          <p className="text-xs text-muted-foreground line-clamp-1">{review.productName}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <Badge variant={PLATFORM_VARIANT[review.platform]}>{review.platform}</Badge>
            <span className="text-xs text-muted-foreground ml-auto">
              {formatRelativeTime(review.createdAt)}
            </span>
          </div>
        </button>
      ))}
    </div>
  )
}
