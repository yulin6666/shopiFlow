'use client'

import { useState } from 'react'
import { ProductReview } from '@/types'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { REVIEW_WORKFLOW_EXPLANATION } from '@/lib/prompts'
import { formatDate } from '@/lib/utils'
import { Star, Info, Copy, Check, RefreshCw, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ReviewDetailProps {
  review: ProductReview
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            'w-4 h-4',
            i <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'
          )}
        />
      ))}
      <span className="ml-1.5 text-sm font-medium">{rating}/5</span>
    </div>
  )
}

export function ReviewDetail({ review }: ReviewDetailProps) {
  const [aiReply, setAiReply] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleGenerateReply() {
    setAiReply('')
    setAiError(null)
    setStreaming(true)

    try {
      const res = await fetch('/api/ai/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review }),
      })

      if (!res.ok) throw new Error('AI request failed')
      if (!res.body) throw new Error('No response body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter((l) => l.startsWith('data: '))
        for (const line of lines) {
          const data = line.slice(6)
          if (data === '[DONE]') continue
          try {
            const json = JSON.parse(data)
            const delta = json.choices?.[0]?.delta?.content ?? ''
            fullText += delta
            setAiReply(fullText)
          } catch {
            // skip malformed chunks
          }
        }
      }
    } catch {
      setAiError('AI processing failed — please try again.')
    } finally {
      setStreaming(false)
    }
  }

  async function handleCopy() {
    if (!aiReply) return
    await navigator.clipboard.writeText(aiReply)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <StarRating rating={review.rating} />
            {review.isHighPriority && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                High Priority
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {review.customerName} · {review.productName} · {review.platform}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <Info className="w-3.5 h-3.5" />
          How it works
        </button>
      </div>

      {/* Review text */}
      <Card>
        <CardContent className="pt-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Review</p>
          <p className="text-sm leading-relaxed">"{review.reviewText}"</p>
          <p className="text-xs text-muted-foreground mt-2">{formatDate(review.createdAt)}</p>
        </CardContent>
      </Card>

      {/* AI reply section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">AI-Generated Reply</p>
          <Button
            size="sm"
            onClick={handleGenerateReply}
            loading={streaming}
            disabled={streaming}
          >
            {aiReply && !streaming ? (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                Regenerate
              </>
            ) : (
              'Generate Reply'
            )}
          </Button>
        </div>

        {aiError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {aiError}
          </div>
        )}

        {(aiReply || streaming) && (
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {aiReply}
                {streaming && (
                  <span className="inline-block w-1.5 h-4 bg-primary ml-0.5 animate-pulse rounded-sm" />
                )}
              </p>
            </CardContent>
          </Card>
        )}

        {aiReply && !streaming && (
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* How it works modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={REVIEW_WORKFLOW_EXPLANATION.title}
      >
        <section>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            System Prompt
          </p>
          <pre className="text-xs bg-muted rounded-lg p-3 whitespace-pre-wrap font-mono leading-relaxed">
            {REVIEW_WORKFLOW_EXPLANATION.prompt}
          </pre>
        </section>
        <section>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            n8n Workflow Logic
          </p>
          <pre className="text-xs bg-muted rounded-lg p-3 whitespace-pre-wrap leading-relaxed">
            {REVIEW_WORKFLOW_EXPLANATION.n8nLogic}
          </pre>
        </section>
        <section>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            How to Scale
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {REVIEW_WORKFLOW_EXPLANATION.extension}
          </p>
        </section>
      </Modal>
    </div>
  )
}
