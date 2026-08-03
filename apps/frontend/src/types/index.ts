// Shopify API types
export interface ShopifyOrder {
  id: number
  order_number: number
  created_at: string
  updated_at: string
  financial_status: 'pending' | 'authorized' | 'partially_paid' | 'paid' | 'partially_refunded' | 'refunded' | 'voided'
  fulfillment_status: 'fulfilled' | 'partial' | 'restocked' | null
  total_price: string
  currency: string
  email: string
  customer: {
    id: number
    first_name?: string
    last_name?: string
    email?: string
  } | null
  billing_address?: {
    first_name?: string
    last_name?: string
    name?: string
    city?: string
    country?: string
  }
  line_items: ShopifyLineItem[]
  shipping_address?: {
    first_name?: string
    last_name?: string
    name?: string
    city: string
    country: string
  }
}

export interface ShopifyLineItem {
  id: number
  title: string
  quantity: number
  price: string
  sku: string
  variant_title: string | null
}

export interface ShopifyProduct {
  id: number
  title: string
  status: string
  variants: {
    id: number
    price: string
    inventory_quantity: number
  }[]
  image?: { src: string }
}

// Support ticket types
export type TicketType = 'shipping_inquiry' | 'return_request' | 'product_complaint' | 'order_delay' | 'general'
export type TicketPriority = 'high' | 'medium' | 'low'
export type TicketChannel = 'Shopify' | 'Amazon' | 'TikTok Shop'
export type TicketStatus = 'open' | 'pending' | 'resolved'

export interface SupportTicket {
  id: string
  type: TicketType
  priority: TicketPriority
  channel: TicketChannel
  status: TicketStatus
  subject: string
  customerMessage: string
  customerName: string
  customerEmail: string
  createdAt: string
  order?: ShopifyOrder
}

// AI response types
export type AIHandlingType = 'refund' | 'shipping' | 'inquiry' | 'needs_human'

export interface AISupportResponse {
  reply: string
  handlingType: AIHandlingType
  confidence: number
}

// Review types
export type ReviewSentiment = 'positive' | 'neutral' | 'negative'
export type ReviewPlatform = 'Shopify' | 'Amazon' | 'Google'

export interface ProductReview {
  id: string
  platform: ReviewPlatform
  rating: number
  sentiment: ReviewSentiment
  customerName: string
  productName: string
  reviewText: string
  createdAt: string
  isHighPriority: boolean
}

// Dashboard types
export interface DashboardStats {
  todayOrders: number
  totalRevenue: number
  pendingTickets: number
  aiHandlingRate: number
}

export interface OrderTrend {
  date: string
  orders: number
  revenue: number
}
