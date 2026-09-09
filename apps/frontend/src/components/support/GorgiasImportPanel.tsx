'use client';

import { useState } from 'react';

interface GorgiasTicketItem {
  ticketId: number;
  subject: string;
  message: string;
  customerName: string;
  customerEmail: string;
  status: string;
  createdAt: string;
}

interface GorgiasImportPanelProps {
  onSendMessage: (message: string) => void;
}

export default function GorgiasImportPanel({ onSendMessage }: GorgiasImportPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tickets, setTickets] = useState<GorgiasTicketItem[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState('');

  const handleFetch = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/gorgias/import?limit=10');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch');
      setTickets(data.messages || []);
      setSelected(new Set());
      setIsOpen(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch Gorgias tickets');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelect = (ticketId: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(ticketId) ? next.delete(ticketId) : next.add(ticketId);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === tickets.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(tickets.map(t => t.ticketId)));
    }
  };

  const handleImport = async () => {
    const toImport = tickets.filter(t => selected.has(t.ticketId));
    for (const ticket of toImport) {
      await new Promise(resolve => setTimeout(resolve, 800));
      onSendMessage(ticket.message);
    }
    setIsOpen(false);
    setTickets([]);
    setSelected(new Set());
  };

  return (
    <>
      {/* 触发按钮 */}
      <button
        onClick={handleFetch}
        disabled={isLoading}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
      >
        {isLoading ? (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        )}
        Import from Gorgias
      </button>

      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}

      {/* 选择面板 */}
      {isOpen && (
        <div className="absolute right-0 top-12 z-20 w-[520px] bg-white border border-gray-200 rounded-xl shadow-xl">
          {/* 头部 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Gorgias Tickets</h3>
              <p className="text-xs text-gray-500 mt-0.5">{tickets.length} open tickets — select to send to AI</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 全选 */}
          <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
            <button
              onClick={selectAll}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
            >
              {selected.size === tickets.length ? 'Deselect all' : 'Select all'}
            </button>
            <span className="text-xs text-gray-400">{selected.size} selected</span>
          </div>

          {/* Ticket 列表 */}
          <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
            {tickets.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-400 text-sm">
                No open tickets found
              </div>
            ) : (
              tickets.map(ticket => (
                <label
                  key={ticket.ticketId}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(ticket.ticketId)}
                    onChange={() => toggleSelect(ticket.ticketId)}
                    className="mt-0.5 accent-emerald-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {ticket.subject}
                      </span>
                      <span className={`shrink-0 text-xs px-1.5 py-0.5 rounded-full ${
                        ticket.status === 'open'
                          ? 'bg-emerald-100 text-emerald-700'
                          : ticket.status === 'pending'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {ticket.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{ticket.message}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {ticket.customerName} · #{ticket.ticketId}
                    </p>
                  </div>
                </label>
              ))
            )}
          </div>

          {/* 底部操作 */}
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <button
              onClick={() => setIsOpen(false)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={selected.size === 0}
              className="px-4 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Send {selected.size > 0 ? `${selected.size} ` : ''}to AI
            </button>
          </div>
        </div>
      )}
    </>
  );
}
