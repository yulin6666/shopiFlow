import Card from '@/components/ui/Card';
import { DashboardKPI } from '@/types';

const kpis: DashboardKPI[] = [
  {
    label: 'Auto-Handled Tickets',
    value: 42,
    change: '+18% vs last week',
    trend: 'up',
    description: 'Support requests resolved without human review',
  },
  {
    label: 'Time Saved Today',
    value: '3.5 hrs',
    change: 'vs manual processing',
    trend: 'up',
    description: 'Based on avg 5 min per ticket × 42 tickets',
  },
  {
    label: 'Review Reply Rate',
    value: '94%',
    change: '+31% vs last month',
    trend: 'up',
    description: 'Reviews with AI-generated replies sent',
  },
  {
    label: 'Escalation Rate',
    value: '8%',
    change: '-3% vs last week',
    trend: 'down',
    description: 'Tickets requiring human intervention',
  },
];

const trendIcon = (trend: 'up' | 'down' | 'neutral') => {
  if (trend === 'up') {
    return (
      <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    );
  }
  if (trend === 'down') {
    return (
      <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
      </svg>
    );
  }
  return null;
};

export default function DashboardKPIs() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className="hover:shadow-md transition-shadow">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{kpi.label}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{kpi.value}</p>
          <div className="mt-1 flex items-center gap-1">
            {trendIcon(kpi.trend)}
            <span className="text-xs text-gray-500">{kpi.change}</span>
          </div>
          <p className="mt-2 text-xs text-gray-400 leading-relaxed">{kpi.description}</p>
        </Card>
      ))}
    </div>
  );
}
