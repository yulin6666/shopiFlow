import { ShopifyOrder, SupportTicket, TicketType, TicketPriority, TicketChannel } from '@/types'

const MOCK_CHANNELS: TicketChannel[] = ['Shopify', 'Amazon', 'TikTok Shop']
const MOCK_TICKETS_EXTRA: SupportTicket[] = [
  {
    id: 'mock-001',
    type: 'return_request',
    priority: 'high',
    channel: 'Amazon',
    status: 'open',
    subject: 'Return request - wrong size received',
    customerMessage:
      "I ordered a Medium but received a Large. I need to return this and get the correct size. It's been 3 days and I need this urgently for an event next week.",
    customerName: 'Sarah Johnson',
    customerEmail: 'sarah.johnson@example.com',
    createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
  },
  {
    id: 'mock-002',
    type: 'product_complaint',
    priority: 'high',
    channel: 'TikTok Shop',
    status: 'open',
    subject: 'Product quality complaint - defective item',
    customerMessage:
      'The zipper broke after only 2 uses. This is completely unacceptable for the price I paid. I want a full refund immediately.',
    customerName: 'Mike Chen',
    customerEmail: 'mike.chen@example.com',
    createdAt: new Date(Date.now() - 1 * 3600000).toISOString(),
  },
]

export function buildTicketsFromOrders(orders: ShopifyOrder[]): SupportTicket[] {
  const tickets: SupportTicket[] = orders.slice(0, 18).map((order, i) => {
    const isUnfulfilled = !order.fulfillment_status
    const type: TicketType = isUnfulfilled ? 'order_delay' : 'shipping_inquiry'
    const priority: TicketPriority = i < 4 ? 'high' : i < 10 ? 'medium' : 'low'
    const channel = MOCK_CHANNELS[i % 3]
    const product = order.line_items[0]?.title ?? 'your order'
    const customerName =
      order.billing_address?.name ||
      (order.billing_address?.first_name
        ? `${order.billing_address.first_name} ${order.billing_address.last_name ?? ''}`.trim()
        : null) ||
      order.customer?.email ||
      order.email ||
      `Customer #${order.order_number}`
    const customerEmail = order.customer?.email ?? order.email ?? 'unknown@example.com'

    const message = isUnfulfilled
      ? `Hi, I placed order #${order.order_number} on ${new Date(order.created_at).toLocaleDateString()} for ${product}. It still shows unfulfilled. Can you please update me on the shipping status?`
      : `Hello, I received a shipping notification for order #${order.order_number} (${product}) but the tracking hasn't updated in 2 days. Can you check on this?`

    return {
      id: `order-${order.id}`,
      type,
      priority,
      channel,
      status: 'open',
      subject: isUnfulfilled
        ? `Order #${order.order_number} - Where is my order?`
        : `Order #${order.order_number} - Tracking update needed`,
      customerMessage: message,
      customerName,
      customerEmail,
      createdAt: order.created_at,
      order,
    }
  })

  return [...tickets, ...MOCK_TICKETS_EXTRA]
}
