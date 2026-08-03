'use client'

import { useState } from 'react'
import { SupportTicket, AIHandlingType } from '@/types'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { formatCurrency, formatDate } from '@/lib/utils'
import { SUPPORT_WORKFLOW_EXPLANATION } from '@/lib/prompts'
import { Info, AlertTriangle, Copy, Check } from 'lucide-react'

interface TicketDetailProps {
  ticket: SupportTicket
}

const HANDLING_LABEL: Record<AIHandlingType, string> = {
  refund: 'Refund',
  shipping: 'Shipping',
  inquiry: 'Inquiry',
  needs_human: 'Needs Human',
}

const HANDLING_VARIANT: Record<AIHandlingType, 'destructive' | 'warning' | 'default' | 'secondary'> = {
  refund: 'destructive',
  shipping: 'warning',
  inquiry: 'default',
  needs_human: 'destructive',
}

function parseAIResponse(raw: string): { reply: string; handlingType: AIHandlingType; confidence: number } {
  const jsonMatch = raw.match(/\{[^}]*"handlingType"[^}]*\}/)
  let handlingType: AIHandlingType = 'inquiry'
  let confidence = 85
  let reply = raw

  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0])
      handlingType = parsed.handlingType ?? 'inquiry'
      confidence = parsed.confidence ?? 85
      reply = raw.replace(jsonMatch[0], '').trim()
    } catch {
      // keep defaults
    }
  }
  return { reply, handlingType, confidence }
}

export function TicketDetail({ ticket }: TicketDetailProps) {
  const [aiReply, setAiReply] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [handlingType, setHandlingType] = useState<AIHandlingType | null>(null)
  const [confidence, setConfidence] = useState<number | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleGenerateReply() {
    setAiReply('')
    setHandlingType(null)
    setConfidence(null)
    setAiError(null)
    setStreaming(true)

    try {
      const res = await fetch('/api/ai/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket }),
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

      const parsed = parseAIResponse(fullText)
      setAiReply(parsed.reply)
      setHandlingType(parsed.handlingType)
      setConfidence(parsed.confidence)
    } catch (e) {
      setAiError('AI processing failed — ticket flagged for manual review.')
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

  const needsHuman = handlingType === 'needs_human' || (confidence !== null && confidence < 70)

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold">{ticket.subject}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {ticket.customerName} · {ticket.customerEmail}
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

      {/* Customer message */}
      <Card>
        <CardContent className="pt-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Customer message</p>
          <p className="text-sm leading-relaxed">{ticket.customerMessage}</p>
          <p className="text-xs text-muted-foreground mt-2">{formatDate(ticket.createdAt)}</p>
        </CardContent>
      </Card>

      {/* Order context */}
      {ticket.order && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">Linked order</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Order</p>
                <p className="font-medium">#{ticket.order.order_number}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="font-medium">
                  {formatCurrency(ticket.order.total_price, ticket.order.currency)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="font-medium capitalize">
                  {ticket.order.fulfillment_status ?? 'Unfulfilled'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Items</p>
                <p className="font-medium text-xs">
                  {ticket.order.line_items.map((i) => i.title).join(', ')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI generate button */}
      <div className="flex items-center gap-3">
        <Button onClick={handleGenerateReply} loading={streaming} disabled={streaming}>
          {streaming ? 'Generating...' : 'AI Generate Reply'}
        </Button>
        {aiReply && !streaming && (
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        )}
      </div>

      {/* Error state */}
      {aiError && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          {aiError}
        </div>
      )}

      {/* AI reply output */}
      {(aiReply || streaming) && (
        <div className="space-y-3">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">AI draft reply</p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {aiReply}
                {streaming && <span className="animate-pulse">▍</span>}
              </p>
            </CardContent>
          </Card>

          {/* Classification + confidence */}
          {handlingType && confidence !== null && !streaming && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Classification:</span>
                <Badge variant={HANDLING_VARIANT[handlingType]}>
                  {HANDLING_LABEL[handlingType]}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Confidence:</span>
                <span className={`text-xs font-semibold ${confidence < 70 ? 'text-red-600' : 'text-green-600'}`}>
                  {confidence}%
                </span>
              </div>
            </div>
          )}

          {/* Needs human warning */}
          {needsHuman && !streaming && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Needs manual review — confidence below threshold or escalation required.
            </div>
          )}
        </div>
      )}

      {/* How it works modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={SUPPORT_WORKFLOW_EXPLANATION.title}
      >
        <section>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            System Prompt
          </p>
          <pre className="text-xs bg-muted rounded-lg p-3 whitespace-pre-wrap font-mono leading-relaxed">
            {SUPPORT_WORKFLOW_EXPLANATION.prompt}
          </pre>
        </section>
        <section>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            n8n Workflow Logic
          </p>
          <pre className="text-xs bg-muted rounded-lg p-3 whitespace-pre-wrap leading-relaxed">
            {SUPPORT_WORKFLOW_EXPLANATION.n8nLogic}
          </pre>
        </section>
        <section>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            How to Scale
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {SUPPORT_WORKFLOW_EXPLANATION.extension}
          </p>
        </section>
      </Modal>
    </div>
  )
}
