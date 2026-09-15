import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import type { MonitoringRecentError } from '@/types';

interface ErrorListProps {
  errors: MonitoringRecentError[];
}

export default function ErrorList({ errors }: ErrorListProps) {
  if (errors.length === 0) {
    return (
      <Card>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Recent Errors (24h)</h3>
        <div className="text-center py-8 text-gray-500 text-sm">
          <p>No errors in the last 24 hours! 🎉</p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Recent Errors (24h)</h3>
      <div className="space-y-3">
        {errors.map((error) => (
          <div key={error.id} className="border-l-4 border-red-500 pl-4 py-2 bg-red-50 rounded-r">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="danger">ERROR</Badge>
                  <span className="text-xs text-gray-500">
                    {new Date(error.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-gray-900 font-mono break-words">{error.errorMsg}</p>
                {error.details?.ticketId && (
                  <p className="text-xs text-gray-500 mt-1">Ticket ID: {error.details.ticketId}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
