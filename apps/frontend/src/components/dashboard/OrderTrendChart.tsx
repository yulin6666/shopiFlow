'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import Card, { CardHeader, CardTitle } from '@/components/ui/Card';
import { OrderTrendPoint } from '@/types';

// Mock 14-day trend data
const trendData: OrderTrendPoint[] = [
  { date: 'Jul 22', orders: 28, revenue: 3240 },
  { date: 'Jul 23', orders: 35, revenue: 4180 },
  { date: 'Jul 24', orders: 31, revenue: 3720 },
  { date: 'Jul 25', orders: 42, revenue: 5060 },
  { date: 'Jul 26', orders: 38, revenue: 4560 },
  { date: 'Jul 27', orders: 29, revenue: 3480 },
  { date: 'Jul 28', orders: 25, revenue: 3000 },
  { date: 'Jul 29', orders: 45, revenue: 5400 },
  { date: 'Jul 30', orders: 52, revenue: 6240 },
  { date: 'Jul 31', orders: 48, revenue: 5760 },
  { date: 'Aug 1', orders: 55, revenue: 6600 },
  { date: 'Aug 2', orders: 61, revenue: 7320 },
  { date: 'Aug 3', orders: 58, revenue: 6960 },
  { date: 'Aug 4', orders: 67, revenue: 8040 },
];

const formatRevenue = (val: number) => `$${(val / 1000).toFixed(1)}k`;

export default function OrderTrendChart() {
  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Order Trend (14 days)</CardTitle>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-green-500 inline-block rounded" /> Orders
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-blue-400 inline-block rounded" /> Revenue
          </span>
        </div>
      </CardHeader>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="ordersGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            yAxisId="orders"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            yAxisId="revenue"
            orientation="right"
            tickFormatter={formatRevenue}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
            formatter={(value: number, name: string) =>
              name === 'revenue' ? [`$${value.toLocaleString()}`, 'Revenue'] : [value, 'Orders']
            }
          />
          <Area
            yAxisId="orders"
            type="monotone"
            dataKey="orders"
            stroke="#22c55e"
            strokeWidth={2}
            fill="url(#ordersGradient)"
          />
          <Area
            yAxisId="revenue"
            type="monotone"
            dataKey="revenue"
            stroke="#60a5fa"
            strokeWidth={2}
            fill="url(#revenueGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}
