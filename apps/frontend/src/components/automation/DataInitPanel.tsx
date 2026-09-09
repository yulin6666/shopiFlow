'use client';

import { useState } from 'react';

type ImportStatus = 'idle' | 'importing' | 'done' | 'error';

interface ImportResult {
  inserted: number;
  breakdown?: {
    shopifyOrders: number;
    shopifyProducts: number;
    amazonOrders: number;
    tiktokOrders: number;
    faqDocs: number;
  };
}

export default function DataInitPanel() {
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    setStatus('importing');
    setError(null);
    try {
      const res = await fetch('/api/admin/init-data', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Import failed');
      setResult({ inserted: data.inserted ?? 0, breakdown: data.breakdown });
      setStatus('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStatus('error');
    }
  };

  const breakdown = result?.breakdown;

  return (
    <div className="border border-gray-200 rounded-xl p-5 bg-white">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Pinecone Knowledge Base</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Load demo data for AI support — Shopify orders/products + Amazon/TikTok/FAQ mock data
          </p>
        </div>
        {status === 'done' && (
          <span className="flex items-center gap-1.5 text-xs text-green-600">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            {result?.inserted} records upserted
          </span>
        )}
      </div>

      {/* Breakdown grid — shown after import */}
      {status === 'done' && breakdown && (
        <div className="grid grid-cols-5 gap-2 mb-4">
          {[
            { label: 'Shopify Orders', value: breakdown.shopifyOrders, color: 'bg-green-50 text-green-700' },
            { label: 'Shopify Products', value: breakdown.shopifyProducts, color: 'bg-green-50 text-green-700' },
            { label: 'Amazon Orders', value: breakdown.amazonOrders, color: 'bg-orange-50 text-orange-700' },
            { label: 'TikTok Orders', value: breakdown.tiktokOrders, color: 'bg-pink-50 text-pink-700' },
            { label: 'FAQ / Policy', value: breakdown.faqDocs, color: 'bg-blue-50 text-blue-700' },
          ].map((item) => (
            <div key={item.label} className={`rounded-lg p-2.5 text-center ${item.color}`}>
              <p className="text-lg font-bold">{item.value}</p>
              <p className="text-xs mt-0.5 leading-tight">{item.label}</p>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</p>
      )}

      <button
        onClick={handleImport}
        disabled={status === 'importing'}
        className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
          status === 'done'
            ? 'bg-green-50 text-green-700 hover:bg-green-100'
            : status === 'importing'
            ? 'bg-gray-100 text-gray-400 cursor-wait'
            : status === 'error'
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : 'bg-gray-900 hover:bg-gray-700 text-white'
        }`}
      >
        {status === 'done'
          ? '✓ Data loaded — click to re-import'
          : status === 'importing'
          ? 'Importing into Pinecone...'
          : status === 'error'
          ? 'Retry Import'
          : 'Load Demo Data into Pinecone'}
      </button>

      {status === 'idle' && (
        <p className="text-xs text-gray-400 text-center mt-2">
          Safe to run multiple times — Pinecone upsert overwrites existing records
        </p>
      )}
    </div>
  );
}
