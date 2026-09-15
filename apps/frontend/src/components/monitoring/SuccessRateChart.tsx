'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import Card from '@/components/ui/Card';
import type { MonitoringMetricsByHour } from '@/types';

interface SuccessRateChartProps {
  data: MonitoringMetricsByHour[];
}

export default function SuccessRateChart({ data }: SuccessRateChartProps) {
  // 按时间升序排列，并计算成功率
  const chartData = [...data]
    .sort((a, b) => new Date(a.timeBucket).getTime() - new Date(b.timeBucket).getTime())
    .map((item) => ({
      time: new Date(item.timeBucket).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      successRate: item.totalExecutions > 0
        ? parseFloat(((item.successCount / item.totalExecutions) * 100).toFixed(1))
        : 0,
      degradationRate: item.totalExecutions > 0
        ? parseFloat(((item.degradedCount / item.totalExecutions) * 100).toFixed(1))
        : 0,
      executions: item.totalExecutions,
    }));

  return (
    <Card>
      <h3 className="text-sm font-semibold text-gray-900 mb-4">
        Success &amp; Degradation Rate (24h)
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="time" tick={{ fontSize: 11 }} />
          <YAxis
            yAxisId="left"
            domain={[0, 100]}
            tick={{ fontSize: 11 }}
            label={{ value: 'Rate (%)', angle: -90, position: 'insideLeft', fontSize: 11 }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11 }}
            label={{ value: 'Executions', angle: 90, position: 'insideRight', fontSize: 11 }}
          />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="successRate"
            stroke="#10b981"
            name="Success Rate (%)"
            strokeWidth={2}
            dot={false}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="degradationRate"
            stroke="#f59e0b"
            name="Degradation Rate (%)"
            strokeWidth={2}
            dot={false}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="executions"
            stroke="#6366f1"
            name="Executions"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
