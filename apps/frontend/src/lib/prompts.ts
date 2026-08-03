import { SupportTicket, ProductReview } from '@/types'
import { formatCurrency } from './utils'

export function buildSupportSystemPrompt(): string {
  return `You are a professional e-commerce customer support AI for ShopiFow, an online fashion brand.

Your job is to generate empathetic, helpful, and on-brand replies to customer support tickets.

Guidelines:
- Be warm, professional, and solution-oriented
- Always acknowledge the customer's concern first
- Provide concrete next steps or solutions
- For shipping issues: offer tracking updates and estimated resolution times
- For returns/refunds: explain the process clearly and offer alternatives
- Keep replies concise (3-5 sentences max)
- Sign off as "ShopiFow Support Team"

After your reply, output a JSON block on a new line in this exact format:
{"handlingType": "refund|shipping|inquiry|needs_human", "confidence": 0-100}

Use "needs_human" if the issue requires manual intervention (complex disputes, legal threats, VIP escalations).`
}

export function buildSupportUserPrompt(ticket: SupportTicket): string {
  let orderContext = ''
  if (ticket.order) {
    const order = ticket.order
    const items = order.line_items.map((i) => `${i.title} x${i.quantity}`).join(', ')
    orderContext = `

Order Context:
- Order #${order.order_number}
- Products: ${items}
- Total: ${formatCurrency(order.total_price, order.currency)}
- Status: ${order.fulfillment_status ?? 'unfulfilled'}
- Placed: ${new Date(order.created_at).toLocaleDateString()}`
  }

  return `Customer: ${ticket.customerName}
Email: ${ticket.customerEmail}
Ticket Type: ${ticket.type}
Priority: ${ticket.priority}
Channel: ${ticket.channel}
${orderContext}

Customer Message:
"${ticket.customerMessage}"

Generate a reply and classification JSON.`
}

export function buildReviewSystemPrompt(): string {
  return `You are a brand voice specialist for ShopiFow, an online fashion brand known for quality and customer care.

Your job is to generate authentic, brand-consistent replies to customer reviews.

Guidelines:
- For 5-star reviews: be warm and grateful, mention something specific from their review
- For 4-star reviews: thank them and address their suggestion constructively
- For 3-star reviews: acknowledge their concern, apologize for shortcomings, offer concrete improvements
- For 1-2 star reviews: lead with a sincere apology, take responsibility, offer a specific resolution (replacement/refund), do NOT be defensive
- Always stay positive and solution-focused
- Keep replies to 2-4 sentences
- Sign off as "— The ShopiFow Team"`
}

export function buildReviewUserPrompt(review: ProductReview): string {
  return `Customer: ${review.customerName}
Product: ${review.productName}
Platform: ${review.platform}
Rating: ${review.rating}/5 stars
Sentiment: ${review.sentiment}
${review.isHighPriority ? 'Priority: HIGH — this needs an especially careful, solution-focused response\n' : ''}
Review:
"${review.reviewText}"

Generate a brand-appropriate reply.`
}

// n8n workflow explanation for the "How it works" modal
export const SUPPORT_WORKFLOW_EXPLANATION = {
  title: 'AI Support — How It Works',
  prompt: buildSupportSystemPrompt(),
  n8nLogic: `In a real deployment, this workflow is triggered via:
1. Shopify Webhook → n8n receives new order/message event
2. n8n fetches full order context from Shopify Admin API
3. n8n calls OpenRouter API (Claude) with the system prompt + order context
4. Confidence < 70% → ticket is flagged for human review in Slack/email
5. High confidence → draft reply is sent to a queue for agent review before sending`,
  extension: `To scale: add Twilio for SMS notifications, integrate Gorgias/Zendesk, set up SLA escalation timers, and connect Shopify customer metafields for VIP routing.`,
}

export const REVIEW_WORKFLOW_EXPLANATION = {
  title: 'Review Reply — How It Works',
  prompt: buildReviewSystemPrompt(),
  n8nLogic: `In a real deployment:
1. Review platform webhook → n8n triggers on new review
2. n8n classifies sentiment and rating
3. 1-2 star reviews → immediate Slack alert + AI draft reply
4. 4-5 star reviews → auto-queue for batch reply
5. All replies require one-click approval before publishing`,
  extension: `To scale: connect Judge.me or Okendo webhooks, add multi-language support for international stores, and track reply performance metrics in a dashboard.`,
}
