import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

interface MetricsCardsProps {
  totalExecutions: number;
  successRate: number;
  degradationRate: number;
  avgLatency: number;
  p95Latency: number;
  lastExecution: string | null;
}

export default function MetricsCards(props: MetricsCardsProps) {
  const {
    totalExecutions,
    successRate,
    degradationRate,
    avgLatency,
    p95Latency,
    lastExecution,
  } = props;

  const successVariant = successRate >= 95 ? 'success' : successRate >= 90 ? 'warning' : 'danger';
  const degradationVariant =
    degradationRate <= 5 ? 'success' : degradationRate <= 10 ? 'warning' : 'danger';
  const latencyVariant = p95Latency <= 5000 ? 'success' : p95Latency <= 10000 ? 'warning' : 'danger';

  const formatTime = (isoString: string | null) => {
    if (!isoString) return 'Never';
    const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      <Card className="hover:shadow-md transition-shadow">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Total Executions (24h)
        </p>
        <p className="mt-2 text-3xl font-bold text-gray-900">{totalExecutions.toLocaleString()}</p>
        <p className="mt-1 text-xs text-gray-400">Last: {formatTime(lastExecution)}</p>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Success Rate</p>
        <div className="mt-2 flex items-baseline gap-2">
          <p className="text-3xl font-bold text-gray-900">{successRate.toFixed(1)}%</p>
          <Badge variant={successVariant}>{successVariant.toUpperCase()}</Badge>
        </div>
        <p className="mt-1 text-xs text-gray-400">Target: &gt; 95%</p>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Degradation Rate</p>
        <div className="mt-2 flex items-baseline gap-2">
          <p className="text-3xl font-bold text-gray-900">{degradationRate.toFixed(1)}%</p>
          <Badge variant={degradationVariant}>{degradationVariant.toUpperCase()}</Badge>
        </div>
        <p className="mt-1 text-xs text-gray-400">Target: &lt; 5%</p>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Avg Response Time
        </p>
        <p className="mt-2 text-3xl font-bold text-gray-900">{Math.round(avgLatency)}ms</p>
        <p className="mt-1 text-xs text-gray-400">Last 24 hours</p>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">P95 Latency</p>
        <div className="mt-2 flex items-baseline gap-2">
          <p className="text-3xl font-bold text-gray-900">{Math.round(p95Latency)}ms</p>
          <Badge variant={latencyVariant}>{latencyVariant.toUpperCase()}</Badge>
        </div>
        <p className="mt-1 text-xs text-gray-400">95th percentile</p>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Workflow Status</p>
        <div className="mt-2 flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
          <p className="text-lg font-semibold text-gray-900">Active</p>
        </div>
        <p className="mt-1 text-xs text-gray-400">shopify-support-handler</p>
      </Card>
    </div>
  );
}
