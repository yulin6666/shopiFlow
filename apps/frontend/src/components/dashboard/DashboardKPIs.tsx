import { DashboardStats } from '@/types'
import { Card, CardContent } from '@/components/ui/Card'
import { formatCurrency } from '@/lib/utils'
import { ShoppingBag, DollarSign, MessageSquare, Zap } from 'lucide-react'

interface DashboardKPIsProps {
  stats: DashboardStats
}

const KPI_CONFIG = [
  {
    key: 'todayOrders' as const,
    label: "Today's Orders",
    icon: ShoppingBag,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    format: (v: number) => v.toString(),
    source: 'Shopify live',
  },
  {
    key: 'totalRevenue' as const,
    label: 'Total Revenue (30d)',
    icon: DollarSign,
    color: 'text-green-600',
    bg: 'bg-green-50',
    format: (v: number) => formatCurrency(v),
    source: 'Shopify live',
  },
  {
    key: 'pendingTickets' as const,
    label: 'Pending Tickets',
    icon: MessageSquare,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    format: (v: number) => v.toString(),
    source: 'Auto-generated',
  },
  {
    key: 'aiHandlingRate' as const,
    label: 'AI Auto-Handle Rate',
    icon: Zap,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    format: (v: number) => `${v}%`,
    source: 'Demo metric',
  },
]

export function DashboardKPIs({ stats }: DashboardKPIsProps) {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {KPI_CONFIG.map(({ key, label, icon: Icon, color, bg, format, source }) => (
        <Card key={key}>
          <CardContent className="pt-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold mt-1">{format(stats[key])}</p>
                <p className="text-xs text-muted-foreground mt-1">{source}</p>
              </div>
              <div className={`p-2 rounded-lg ${bg}`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
