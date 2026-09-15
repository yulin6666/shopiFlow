'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import Card from '@/components/ui/Card';

interface ClassificationPieChartProps {
  autoCount: number;
  draftCount: number;
  escalateCount: number;
}

export default function ClassificationPieChart({
  autoCount,
  draftCount,
  escalateCount,
}: ClassificationPieChartProps) {
  const data = [
    { name: 'Auto', value: autoCount, color: '#10b981' },
    { name: 'Draft', value: draftCount, color: '#f59e0b' },
    { name: 'Escalate', value: escalateCount, color: '#ef4444' },
  ];

  const total = autoCount + draftCount + escalateCount;

  if (total === 0) {
    return (
      <Card>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          Classification Distribution (24h)
        </h3>
        <div className="flex items-center justify-center h-[300px] text-gray-400 text-sm">
          No data available
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="text-sm font-semibold text-gray-900 mb-4">
        Classification Distribution (24h)
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={(entry) =>
              `${entry.name}: ${entry.value} (${((entry.value / total) * 100).toFixed(1)}%)`
            }
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}
