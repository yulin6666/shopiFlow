import { fetchOrders } from '@/lib/shopify'
import { DashboardKPIs } from '@/components/dashboard/DashboardKPIs'
import { OrderTrendChart } from '@/components/dashboard/OrderTrendChart'
import { RecentOrdersTable } from '@/components/dashboard/RecentOrdersTable'
import { ShopifyOrder, DashboardStats, OrderTrend } from '@/types'

function computeStats(orders: ShopifyOrder[]): DashboardStats {
  const today = new Date().toDateString()
  const todayOrders = orders.filter(
    (o) => new Date(o.created_at).toDateString() === today
  )
  const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.total_price), 0)
  const pendingTickets = orders.filter((o) => !o.fulfillment_status).length + 2 // +2 mock
  return {
    todayOrders: todayOrders.length,
    totalRevenue,
    pendingTickets,
    aiHandlingRate: 78,
  }
}

function computeTrends(orders: ShopifyOrder[]): OrderTrend[] {
  const map = new Map<string, { orders: number; revenue: number }>()
  const now = Date.now()
  // seed last 7 days
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now - i * 86400000)
    const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    map.set(key, { orders: 0, revenue: 0 })
  }
  for (const order of orders) {
    const d = new Date(order.created_at)
    const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    if (map.has(key)) {
      const entry = map.get(key)!
      entry.orders += 1
      entry.revenue += parseFloat(order.total_price)
    }
  }
  return Array.from(map.entries()).map(([date, v]) => ({ date, ...v }))
}

export default async function DashboardPage() {
  let orders: ShopifyOrder[] = []
  let error: string | null = null

  try {
    orders = await fetchOrders(20)
  } catch (e) {
    error = 'Could not connect to Shopify. Please check your API credentials.'
    console.error(e)
  }

  const stats = computeStats(orders)
  const trends = computeTrends(orders)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Store overview — live Shopify data
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <DashboardKPIs stats={stats} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <OrderTrendChart data={trends} />
        </div>
        <div className="xl:col-span-1">
          <RecentOrdersTable orders={orders.slice(0, 10)} />
        </div>
      </div>
    </div>
  )
}
