// ---- Shopify ----

export interface ShopifyOrder {
  id: number;
  name: string; // e.g. "#1001"
  email: string;
  financial_status: string;
  fulfillment_status: string | null;
  total_price: string;
  currency: string;
  created_at: string;
  line_items: ShopifyLineItem[];
  shipping_address?: ShopifyAddress;
  tracking_number?: string;
}

export interface ShopifyLineItem {
  id: number;
  title: string;
  quantity: number;
  price: string;
  variant_title: string | null;
}

export interface ShopifyAddress {
  first_name: string;
  last_name: string;
  address1: string;
  city: string;
  province: string;
  country: string;
  zip: string;
}

export interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string;
  vendor: string;
  product_type: string;
  status: string;
  variants: ShopifyVariant[];
  images: ShopifyImage[];
  tags: string;
}

export interface ShopifyVariant {
  id: number;
  title: string;
  price: string;
  inventory_quantity: number;
  sku: string;
}

export interface ShopifyImage {
  id: number;
  src: string;
  alt: string | null;
}

// ---- Support Chat ----

export type MessageRole = 'user' | 'assistant';
export type TicketSource = 'shopify' | 'amazon' | 'tiktok';
export type EscalationLevel = 'auto' | 'draft' | 'escalated';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  source?: TicketSource;
  escalation?: EscalationLevel;
  escalationReason?: string;
  draftReply?: string;
}

export interface SupportChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  sessionId: string | null;
}

// ---- Reviews ----

export type ReviewPlatform = 'shopify' | 'amazon' | 'tiktok';
export type ReviewStatus = 'pending' | 'replied' | 'generating';

export interface Review {
  id: string;
  platform: ReviewPlatform;
  author: string;
  rating: number; // 1-5
  title: string;
  content: string;
  date: string;
  productName: string;
  language: string;
  status: ReviewStatus;
  generatedReply?: string;
}

// ---- Automation ----

export type WorkflowStatus = 'idle' | 'running' | 'success' | 'error';

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  status: WorkflowStatus;
}

export interface AutomationWorkflow {
  id: string;
  name: string;
  description: string;
  trigger: string;
  steps: WorkflowStep[];
  lastRun?: string;
  status: WorkflowStatus;
  stats: {
    totalRuns: number;
    successRate: number;
    avgDuration: string;
  };
}

// ---- Dashboard KPIs ----

export interface DashboardKPI {
  label: string;
  value: string | number;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  description: string;
}

export interface OrderTrendPoint {
  date: string;
  orders: number;
  revenue: number;
}

// ---- Gorgias ----

export interface GorgiasTicket {
  id: number;
  subject: string;
  status: 'open' | 'closed' | 'pending';
  channel: string;
  source: TicketSource;
  customerName: string;
  customerEmail: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  isUnread: boolean;
  // AI processing result (filled client-side after classification)
  escalation?: EscalationLevel;
  escalationReason?: string;
  draftReply?: string;
  aiProcessed?: boolean;
}

export interface GorgiasMessage {
  id: number;
  bodyText: string;
  fromName: string;
  fromAddress: string;
  createdAt: string;
}

// ---- API Responses ----

export interface ApiResponse<T> {
  data: T;
  error?: string;
}

export interface SupportQueryResponse {
  reply: string;
  escalation: EscalationLevel;
  escalationReason?: string;
  draftReply?: string;
  source: TicketSource;
}

export interface ReviewReplyResponse {
  reply: string;
  language: string;
}
