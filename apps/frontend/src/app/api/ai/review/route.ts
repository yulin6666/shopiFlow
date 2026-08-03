import { NextRequest } from 'next/server'
import { buildReviewSystemPrompt, buildReviewUserPrompt } from '@/lib/prompts'
import { ProductReview } from '@/types'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { review }: { review: ProductReview } = await req.json()

    const systemPrompt = buildReviewSystemPrompt()
    const userPrompt = buildReviewUserPrompt(review)

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://shopiflow.demo',
        'X-Title': 'ShopiFow Demo',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4-6',
        stream: true,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 400,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return new Response(JSON.stringify({ error: `OpenRouter error: ${err}` }), { status: 500 })
    }

    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (err) {
    console.error('AI review route error:', err)
    return new Response(JSON.stringify({ error: 'AI processing failed' }), { status: 500 })
  }
}
