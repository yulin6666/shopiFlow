import { ShopifyOrder } from '@/types'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency, formatDate } from '@/lib/utils'

interface RecentOrdersTableProps {
  orders: ShopifyOrder[]
}

function getFulfillmentBadge(status: string | null) {
  if (!status) return <Badge variant="warning">Unfulfilled</Badge>
  if (status === 'fulfilled') return <Badge variant="success">Fulfilled</Badge>
  return <Badge variant="secondary">{status}</Badge>
}

export function RecentOrdersTable({ orders }: RecentOrdersTableProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Recent Orders</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="flex items-start justify-between gap-2 py-2 border-b last:border-0">
              <div className="min-w-0">
                <p className="text-xs font-medium">#{order.order_number}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {order.billing_address?.name ||
                    (order.billing_address?.first_name
                      ? `${order.billing_address.first_name} ${order.billing_address.last_name ?? ''}`.trim()
                      : null) ||
                    order.customer?.email ||
                    order.email ||
                    `Customer #${order.order_number}`}
                </p>
                <p className="text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-semibold">{formatCurrency(order.total_price, order.currency)}</p>
                <div className="mt-1">{getFulfillmentBadge(order.fulfillment_status)}</div>
              </div>
            </div>
          ))}
          {orders.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">No orders found</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
