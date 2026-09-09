import Card, { CardHeader, CardTitle } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ShopifyOrder } from '@/types';

interface RecentOrdersTableProps {
  orders: ShopifyOrder[];
}

function fulfillmentBadge(status: string | null) {
  if (!status || status === 'unfulfilled') return <Badge variant="warning">Unfulfilled</Badge>;
  if (status === 'fulfilled') return <Badge variant="success">Fulfilled</Badge>;
  if (status === 'partial') return <Badge variant="info">Partial</Badge>;
  return <Badge>{status}</Badge>;
}

function financialBadge(status: string) {
  if (status === 'paid') return <Badge variant="success">Paid</Badge>;
  if (status === 'pending') return <Badge variant="warning">Pending</Badge>;
  if (status === 'refunded') return <Badge variant="danger">Refunded</Badge>;
  return <Badge>{status}</Badge>;
}

// Fallback mock orders when Shopify is not configured
const MOCK_ORDERS: ShopifyOrder[] = [
  {
    id: 5001,
    name: '#5001',
    email: 'sarah@example.com',
    financial_status: 'paid',
    fulfillment_status: 'fulfilled',
    total_price: '89.95',
    currency: 'USD',
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    line_items: [{ id: 1, title: 'Daily Wellness Bundle', quantity: 2, price: '44.95', variant_title: null }],
  },
  {
    id: 5002,
    name: '#5002',
    email: 'james@example.com',
    financial_status: 'paid',
    fulfillment_status: null,
    total_price: '34.99',
    currency: 'USD',
    created_at: new Date(Date.now() - 5 * 3600000).toISOString(),
    line_items: [{ id: 2, title: 'Omega-3 Fish Oil 1000mg', quantity: 1, price: '34.99', variant_title: null }],
  },
  {
    id: 5003,
    name: '#5003',
    email: 'yuki@example.com',
    financial_status: 'pending',
    fulfillment_status: null,
    total_price: '124.50',
    currency: 'USD',
    created_at: new Date(Date.now() - 8 * 3600000).toISOString(),
    line_items: [{ id: 3, title: 'Collagen Glow Complex', quantity: 3, price: '41.50', variant_title: null }],
  },
  {
    id: 5004,
    name: '#5004',
    email: 'carlos@example.com',
    financial_status: 'paid',
    fulfillment_status: 'fulfilled',
    total_price: '59.99',
    currency: 'USD',
    created_at: new Date(Date.now() - 12 * 3600000).toISOString(),
    line_items: [{ id: 4, title: 'Relaxation Blend', quantity: 1, price: '59.99', variant_title: null }],
  },
  {
    id: 5005,
    name: '#5005',
    email: 'emma@example.com',
    financial_status: 'refunded',
    fulfillment_status: 'fulfilled',
    total_price: '44.95',
    currency: 'USD',
    created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
    line_items: [{ id: 5, title: 'Daily Wellness Bundle', quantity: 1, price: '44.95', variant_title: null }],
  },
];

export default function RecentOrdersTable({ orders }: RecentOrdersTableProps) {
  const displayOrders = orders.length > 0 ? orders.slice(0, 5) : MOCK_ORDERS;
  const isMock = orders.length === 0;

  return (
    <Card padding="none" className="col-span-2">
      <div className="px-4 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <CardTitle>Recent Orders</CardTitle>
          {isMock && (
            <span className="text-xs text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full">
              Demo data — connect Shopify to see real orders
            </span>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-50">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Order</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Customer</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Product</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Amount</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Payment</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Fulfillment</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
            </tr>
          </thead>
          <tbody>
            {displayOrders.map((order, idx) => (
              <tr key={order.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                <td className="px-4 py-3 font-mono text-gray-700 font-medium">{order.name}</td>
                <td className="px-4 py-3 text-gray-600 max-w-[120px] truncate">{order.email}</td>
                <td className="px-4 py-3 text-gray-600 max-w-[160px] truncate">
                  {order.line_items[0]?.title ?? '—'}
                </td>
                <td className="px-4 py-3 text-gray-900 font-medium">
                  {formatCurrency(order.total_price, order.currency)}
                </td>
                <td className="px-4 py-3">{financialBadge(order.financial_status)}</td>
                <td className="px-4 py-3">{fulfillmentBadge(order.fulfillment_status)}</td>
                <td className="px-4 py-3 text-gray-500">{formatDate(order.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
