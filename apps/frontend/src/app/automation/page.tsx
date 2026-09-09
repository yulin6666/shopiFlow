import AutomationPanel from '@/components/automation/AutomationPanel';
import DataInitPanel from '@/components/automation/DataInitPanel';

export default function AutomationPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Automation Workflows</h1>
        <p className="text-sm text-gray-500 mt-1">
          n8n workflows running in self-hosted Docker — click to simulate a live run
        </p>
      </div>

      <div className="mb-6">
        <DataInitPanel />
      </div>

      <AutomationPanel />
    </div>
  );
}
