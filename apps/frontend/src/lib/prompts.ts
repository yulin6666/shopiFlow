import { EscalationLevel, ReviewPlatform } from '@/types';

// ---- Support: AI classification & escalation prompt ----

export const SUPPORT_SYSTEM_PROMPT = `You are an AI customer support agent for an e-commerce supplement brand selling on Shopify, Amazon, and TikTok Shop.

Your job is to:
1. Classify the customer message into one of three categories:
   - AUTO: Standard question you can answer directly (order status, shipping policy, product FAQ)
   - DRAFT: Non-standard question that needs a human review before sending (refunds, complaints)
   - ESCALATE: High-risk issue requiring immediate human takeover (health reactions, legal threats, account risks)

2. Respond in JSON format ONLY:
{
  "escalation": "auto" | "draft" | "escalated",
  "escalationReason": "reason if draft or escalated, null if auto",
  "reply": "your reply to the customer (for auto), or draft reply (for draft), or null (for escalated)"
}

ESCALATION RULES (always ESCALATE for these):
- Any mention of adverse health reactions, allergies, side effects
- Threats to leave negative reviews or report to platforms
- Amazon A-to-Z claims or chargeback threats
- Customers identifying as high-value (KOL, influencer, wholesale)
- Legal language or threats

DRAFT RULES (always DRAFT for these):
- Refund or return requests
- General complaints about product quality
- Shipping delays with frustration expressed

AUTO RULES:
- Order tracking ("where is my order", "tracking number")
- Policy questions (returns, shipping times)
- Product FAQs (ingredients, usage, dosage)
- Simple positive feedback

Order data (if available) will be provided in the user message context.`;

export const SUPPORT_ESCALATION_MESSAGES: Record<EscalationLevel, string> = {
  auto: 'AI replied automatically',
  draft: 'AI drafted a reply — awaiting human approval before sending',
  escalated: 'Escalated to human agent — AI will not respond',
};

// ---- Review Reply prompt ----

export const buildReviewReplyPrompt = (
  platform: ReviewPlatform,
  rating: number,
  reviewContent: string,
  productName: string,
  language: string,
  targetLanguage?: string,
): string => {
  const lang = targetLanguage || language;
  const tone = rating >= 4 ? 'warm and grateful' : rating === 3 ? 'understanding and helpful' : 'empathetic and solution-focused';

  return `You are a brand manager for a premium supplement e-commerce brand. Write a professional, authentic reply to this customer review.

Platform: ${platform}
Product: ${productName}
Rating: ${rating}/5
Review language: ${language}
Reply language: ${lang}
Tone: ${tone}

Review:
"${reviewContent}"

Guidelines:
- Keep the reply under 80 words
- Be genuine, not corporate-sounding
- For low ratings (1-2): acknowledge the issue, apologize sincerely, offer to resolve
- For medium ratings (3): thank them, address any concerns mentioned
- For high ratings (4-5): express genuine gratitude, reinforce the brand promise
- Never make medical claims
- Reply in ${lang} language only
- Do NOT include any JSON, just write the reply text directly`;
};

// ---- Workflow explanation prompts (for Automation tab) ----

export const WORKFLOW_DESCRIPTIONS = {
  orderSync: {
    name: 'Order Sync to Pinecone',
    description: 'Hourly: fetches new Shopify orders and upserts them into Pinecone vector index so the support agent can look up real order data.',
    trigger: 'Every hour (cron)',
    steps: [
      { id: 's1', name: 'Cron Trigger', description: 'Fires every hour' },
      { id: 's2', name: 'Fetch Shopify Orders', description: 'HTTP GET to Shopify Admin API' },
      { id: 's3', name: 'Format Documents', description: 'Flatten order fields into text chunks' },
      { id: 's4', name: 'Embed & Upsert', description: 'OpenAI embeddings → Pinecone upsert' },
    ],
  },
  supportChat: {
    name: 'Support Chat RAG Agent',
    description: 'Webhook: receives chat message, classifies escalation level, retrieves order context from Pinecone, and returns a structured JSON reply.',
    trigger: 'POST /webhook/support-chat',
    steps: [
      { id: 's1', name: 'Webhook Receive', description: 'Accept POST with message + source' },
      { id: 's2', name: 'RAG Retrieval', description: 'Query Pinecone for relevant order data' },
      { id: 's3', name: 'AI Classification', description: 'Claude classifies: auto/draft/escalate' },
      { id: 's4', name: 'Format Response', description: 'Return JSON with reply and escalation' },
    ],
  },
  reviewReply: {
    name: 'Review Reply Generator',
    description: 'Webhook: takes a review object, generates a brand-voice reply in the appropriate language via OpenRouter Claude.',
    trigger: 'POST /webhook/review-reply',
    steps: [
      { id: 's1', name: 'Webhook Receive', description: 'Accept review data with language' },
      { id: 's2', name: 'Build Prompt', description: 'Format review + brand guidelines prompt' },
      { id: 's3', name: 'Claude Generate', description: 'OpenRouter → claude-sonnet-4-6' },
      { id: 's4', name: 'Return Reply', description: 'Return reply text in requested language' },
    ],
  },
};
