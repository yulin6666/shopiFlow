# n8n-Powered E-Commerce AI Automation System

This project automates the full customer support and review management lifecycle for a multi-platform e-commerce brand — handling Shopify, Amazon, and TikTok Shop customer inquiries with intelligent AI classification, real-time order lookup, and multi-language review replies. Three production-ready n8n workflows replace manual triage, order tracking, and review responses with zero human intervention for 70-80% of tickets. A Next.js demo interface makes every workflow step visible and interactive.

The core idea: n8n is not just glue code between APIs. It's the intelligence layer. Each workflow is a self-contained, visual, and auditable automation that replaces what would otherwise require hundreds of lines of custom Python or TypeScript.

**Live Demo:** [部署后填入]

---

## **E-Commerce AI Automation Engine**

💡

- **Unified Multi-Platform Support Inbox:** Consolidates Shopify, Amazon, and TikTok Shop customer messages into a single AI-powered pipeline. Each incoming message is classified (`auto` / `draft` / `escalate`) and auto-replied or routed for human approval — eliminating context-switching across 3 separate dashboards. RAG retrieves relevant order details from Pinecone before generating the response.
- **Auto-Reply with Human-in-the-Loop:** 70-80% of standard questions (order tracking, policy FAQs) get instant AI replies. Refund requests and complaints are drafted by AI, then flagged for human review. High-risk messages (health reactions, legal threats, A-to-Z claims) trigger immediate Slack escalation and block auto-sending.
- **Multi-Language Review Reply Automation:** Judge.me reviews are automatically replied to in 5 languages with brand-consistent tone. Low-rating reviews (1-3 stars) require human approval before publishing. RAG pulls product details from Pinecone to ground replies in official documentation and prevent medical claims.

👉 [click for details](#workflow-1-data-initialization--shopify--multi-platform-order-ingestion)

---

## **Workflow 1: Data Initialization — Shopify + Multi-Platform Order Ingestion**

Triggered manually via webhook to initialize the knowledge base. Fetches live data from Shopify and merges with mock Amazon/TikTok orders, then embeds and upserts to Pinecone for semantic retrieval.

- **Multi-Source Data Fetching:** Three parallel branches — Shopify Orders (live API), Shopify Products (live API), and Mock Data Generator (Amazon orders, TikTok orders, FAQ policies) — execute simultaneously via n8n's parallel execution.
- **Semantic Chunking & Embedding:** Each order and product is formatted into a text representation with structured metadata. An HTTP Request node calls OpenAI's `text-embedding-3-small` model to generate 1536-dimensional vectors for every record.
- **Pinecone Upsert with Metadata Filtering:** Vectors are upserted to Pinecone index `shopiflow-doc` with rich metadata (`platform`, `type`, `orderId`, `status`, `vendor`) — enabling downstream workflows to filter by order status, product vendor, or platform during retrieval.
- **Response Aggregation:** A final Code node counts inserted records by type (Shopify orders, products, Amazon orders, TikTok orders, FAQ docs) and returns a structured breakdown to the webhook caller.

![Data Init Workflow](workflow1.png)

---

## **Workflow 2: Shopify Support Handler — RAG-Powered AI Agent with 3-Tier Classification**

Triggered by the Shopify support webhook. Retrieves relevant order context from Pinecone and classifies the customer message into `auto`, `draft`, or `escalate` — each routed to a different downstream action.

- **Semantic Order Lookup via Pinecone Tool:** The LangChain Agent node is wired to a Pinecone vector store (mode: `retrieve-as-tool`). When the customer mentions an order number or asks "Where is my order?", the agent autonomously calls the tool to retrieve the top-3 most semantically similar order records. The system prompt instructs the agent to **filter retrieved results** by metadata (e.g., only show records where `metadata.vendor="NIKE"` if the user asks about NIKE products).
- **AI Classification with Structured JSON Output:** The agent is prompt-engineered to return strict JSON: `{ classification: "auto|draft|escalate", reason: "...", risk_level: "low|medium|high", reply: "..." }`. A Code node parses this output and validates the structure — any parse failure defaults to `escalate` for safety.
- **Conditional Routing via Switch Node:** Based on `classification`, the workflow branches into three paths:
  - **auto** → Respond immediately with the AI-generated reply
  - **draft** → Respond with `status: "needs_review"` (frontend shows draft for human approval)
  - **escalate** → Send a Slack alert to the support team (with ticket details, risk level, original message) and respond with `reply: null` to block auto-sending
- **Zero Hallucination Design:** The system prompt explicitly forbids making up prices, stock levels, or order details — the agent must only use information from Pinecone tool results after filtering.

![Shopify Support Workflow](workflow2.png)

---

## **Workflow 3: Judge.me Review Reply Generator — Multi-Language Brand Voice AI**

Triggered by the Judge.me webhook. Generates brand-aligned review replies in the customer's language, with automatic approval routing based on star rating.

- **RAG-Enhanced Product Knowledge:** The AI agent has access to a Pinecone tool (`Product Knowledge`) containing product FAQs, ingredient lists, and usage instructions. When replying to a review mentioning "side effects" or "how to use", the agent retrieves relevant product details from the knowledge base and grounds the response in official documentation — preventing off-brand or inaccurate replies.
- **Rating-Based Approval Logic:** A Switch node routes by rating:
  - 4-5 stars → `auto_replied` (sent immediately)
  - 1-3 stars → `needs_approval` (draft sent to Slack for human review before publishing)
- **Guardrails Against Medical Claims:** The system prompt explicitly forbids health/therapeutic claims ("cures acne", "treats inflammation") and instructs the agent to redirect health questions to the support email. If the review mentions side effects, the reply acknowledges concern and provides a support contact — never dismissing or diagnosing.
- **Slack Approval Request for Low Ratings:** Low-rating reviews trigger a Slack message with the original review, AI-generated draft, and review metadata. A human can approve, edit, or reject before it's published to the public review platform.

![Review Reply Workflow](workflow3.png)

---

## **Technical Core**

- **RAG-Powered Order Intelligence:** Pinecone stores 50+ Shopify orders, 10 Amazon orders, 10 TikTok orders, 50+ products, and 5 FAQ documents — all semantically searchable. When a customer asks "What's the status of my order?", the AI agent retrieves the exact order record by embedding the question and querying Pinecone (top-K=3), then filters results by metadata to surface only relevant records. This replaces manual order lookup and copy-pasting tracking numbers.
- **3-Tier Risk Classification with Explainability:** Every support message is classified into `auto` (standard questions), `draft` (needs human review), or `escalate` (immediate human takeover). The AI returns a `reason` field explaining why it made that decision (e.g., "contains refund request keyword" or "health reaction mentioned"). This explainability allows support managers to audit AI decisions and refine classification rules over time.
- **Multi-Language Review Replies with Brand Consistency:** The review reply workflow generates responses in English, Chinese, Spanish, Japanese, and German — matching the language of the original review. A brand voice system prompt ensures all replies are warm, non-corporate, and never make medical claims, regardless of language. The AI is instructed to keep replies under 80 words to match platform character limits and user attention spans.

---

## **Demo Interface (Supporting Layer)**

**Live Demo:** [部署后填入]

The Next.js frontend and demo interface exist solely to make the n8n workflows interactive and visible during a demo. They handle webhook simulation, surface workflow results, and visualize the automation pipeline.

### **How the Demo Surfaces the Core Workflows**

**Workflow 1 — Data Initialization:**

- Navigate to `/automation` page
- Click "Initialize Data" button in the Data Init workflow card
- Watch the progress indicator as the workflow fetches Shopify data, generates embeddings, and upserts to Pinecone
- A success toast shows the breakdown: "Inserted 127 vectors: 48 Shopify orders, 52 products, 5 Amazon orders, 5 TikTok orders, 5 FAQ docs"

**Workflow 2 — Support Classification:**

- Navigate to `/support` page
- **Demo Chat tab:** Click a pre-written message (e.g., "Where is my order #1180?")
- The message is sent to the Shopify Support Handler webhook
- Within ~2 seconds: AI retrieves order context from Pinecone, classifies as `auto`, and displays the reply with retrieved order details
- Try escalation: Click "I had a severe allergic reaction to your product" → AI classifies as `escalate`, displays "This ticket requires immediate human attention", and shows the Slack alert payload

**Workflow 3 — Review Replies:**

- Navigate to `/reviews` page
- Real Judge.me reviews are loaded (or 8 mock reviews if Judge.me is not configured)
- Select a target language (English / 中文 / Español / 日本語 / Deutsch) from the dropdown
- Click "Generate Reply" on a single review → AI generates a brand-voice reply in the selected language within ~2 seconds
- For low-rating reviews (1-3 stars): the reply is marked "Needs Approval" and a Slack notification is shown

They are intentionally thin. The intelligence lives in n8n.

---

## **Technical Stack**

| Role | Technology |
| --- | --- |
| Workflow Engine | n8n (self-hosted via Docker) |
| LLM | OpenRouter (Claude Sonnet 4.6 via LangChain node) |
| Embedding Model | OpenAI text-embedding-3-small (1536 dimensions) |
| Vector Store | Pinecone (serverless index) |
| E-Commerce Platform | Shopify (Admin API) |
| Review Platform | Judge.me (Shopify reviews) |
| Notifications | Slack |
| Demo Frontend | Next.js 14, Tailwind CSS |
| Deployment | Railway |

---

## **What This Demonstrates**

- **n8n as a production AI automation layer** — 3 workflows, 50+ nodes total, handling the full customer support and review management lifecycle with semantic search, intelligent classification, and multi-language generation
- **RAG without a custom vector database layer** — Pinecone is accessed directly via n8n's LangChain integration, eliminating the need for custom Python/TypeScript RAG middleware
- **Real business logic in n8n** — metadata filtering, JSON parsing, conditional routing, Slack alerting, and explainable AI decisions — all implemented visually without code
- **Multi-platform data orchestration** — a single support message can query Shopify orders, Amazon orders, and TikTok orders in Pinecone, then route based on platform-specific metadata, coordinated entirely by n8n
