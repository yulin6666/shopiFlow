# ShopiFow Project Memory

## Project Overview
- **Location**: /Users/lindediannao/Documents/project/shopiFlow
- **Type**: Shopify + n8n AI automation demo (Upwork portfolio)
- **Stack**: Next.js 14 (App Router) + OpenRouter (Claude) + n8n + Pinecone + PostgreSQL

## Key Architecture
- Frontend only (no separate backend), all API calls in Next.js API routes
- AI via OpenRouter API — model: `anthropic/claude-sonnet-4-6`
- n8n runs at /Users/lindediannao/Documents/project/n8n/self-hosted-ai-starter-kit (Docker, port 5678)
- Do NOT touch shopiFlow's own docker-compose.yml — n8n is external
- Vector store: **Pinecone** (index: `shopiflow-orders`) — NOT pgvector, NOT Qdrant
- RAG pattern follows RagFlow project at /Users/lindediannao/Documents/project/RagFlow

## Current Status (2026-08-05)
- **FULLY BUILT** — build passes clean (0 TS errors)
- All pages: Dashboard, Support Chat, Reviews, Automation
- All API routes: /api/ai/support, /api/ai/review, /api/shopify/orders, /api/shopify/products
- 3 n8n workflows: order-sync.json, support-ticket-handler.json, review-reply-generator.json
- setup.sh: one-command deploy

## n8n Workflow Pattern (from RagFlow)
- Insert: `vectorStorePinecone` (mode: insert) + `documentDefaultDataLoader` + `textSplitterRecursiveCharacterTextSplitter` + `embeddingsOpenAi`
- Query: `vectorStorePinecone` (mode: retrieve-as-tool) wired as `ai_tool` to LangChain agent
- Embeddings: `embeddingsOpenAi` node with `text-embedding-3-small`, credential name `"OpenAI API"`
- LLM: `lmChatOpenAi` node with OpenRouter-compatible credential name `"OpenRouter (OpenAI-compatible)"`
- Pinecone credential name: `"Pinecone API"` (id: `"pinecone-api"`)

## Important Files
- `n8n/workflows/order-sync.json` — hourly Shopify → Pinecone sync
- `n8n/workflows/support-ticket-handler.json` — Chat RAG webhook (LangChain agent)
- `n8n/workflows/review-reply-generator.json` — review AI replies
- `apps/frontend/src/app/api/ai/support/route.ts` — proxies chat to n8n webhook, falls back to direct OpenRouter
- `apps/frontend/src/app/api/ai/review/route.ts` — proxies review to n8n webhook, falls back to direct OpenRouter
- `apps/frontend/src/components/support/SupportChat.tsx` — chat UI with 3 demo paths
- `apps/frontend/src/components/reviews/ReviewList.tsx` — 8 mock reviews, multi-lang reply
- `apps/frontend/src/components/automation/AutomationPanel.tsx` — workflow visualization
- `apps/frontend/src/lib/shopify.ts` — Shopify Admin API client
- `apps/frontend/src/lib/prompts.ts` — AI prompts + workflow explanations
- `apps/frontend/src/lib/reviews.ts` — mock review data (8 reviews)
- `database/init.sql` — PostgreSQL schema (ai_processing_log only, no pgvector)
- `setup.sh` — one-command deploy
- `docs/SETUP.md` — full Chinese deployment guide

## Env Variables Required
- `OPENROUTER_API_KEY` — from openrouter.ai (required)
- `SHOPIFY_STORE_DOMAIN` — e.g. your-store.myshopify.com (optional, shows mock data without it)
- `SHOPIFY_ACCESS_TOKEN` — Shopify Custom App Admin API token (optional)
- `N8N_WEBHOOK_BASE_URL` — http://localhost:5678 (defaults to direct OpenRouter if n8n down)
- `PINECONE_API_KEY` — needed in n8n credential, not in frontend .env

## Types
- `ChatMessage` — `{ id, role: 'user'|'assistant', content, timestamp, source?, escalation?, escalationReason?, draftReply? }`
- `Review` — with status: 'pending'|'replied'|'generating'
- `EscalationLevel` — 'auto'|'draft'|'escalated'

## User Preferences
- Code in English, docs/comments in Chinese
- n8n workflows as importable JSON files, user imports manually
- Do NOT modify /Users/lindediannao/Documents/project/n8n/self-hosted-ai-starter-kit
- Reference RagFlow project for n8n+Pinecone patterns
- Local first, Railway compatible
