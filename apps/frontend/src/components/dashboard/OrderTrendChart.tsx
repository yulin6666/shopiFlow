'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { OrderTrend } from '@/types'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface OrderTrendChartProps {
  data: OrderTrend[]
}

export function OrderTrendChart({ data }: OrderTrendChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Trend — Last 7 Days</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
              formatter={(value: number, name: string) =>
                name === 'revenue' ? [`$${value.toFixed(2)}`, 'Revenue'] : [value, 'Orders']
              }
            />
            <Line
              type="monotone"
              dataKey="orders"
              stroke="hsl(262, 83%, 58%)"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
