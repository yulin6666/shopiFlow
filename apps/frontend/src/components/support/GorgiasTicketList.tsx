'use client';

import { useState, useEffect } from 'react';
import { GorgiasTicket, EscalationLevel } from '@/types';
import { getPlatformColor, formatRelativeTime } from '@/lib/utils';

const escalationColors: Record<EscalationLevel, string> = {
  auto: 'bg-green-50 border-green-200',
  draft: 'bg-yellow-50 border-yellow-200',
  escalated: 'bg-red-50 border-red-200',
};

const escalationLabels: Record<EscalationLevel, string> = {
  auto: 'Auto-reply ready',
  draft: 'Draft — needs approval',
  escalated: 'Escalated to human',
};

export default function GorgiasTicketList() {
  const [tickets, setTickets] = useState<GorgiasTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<GorgiasTicket | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [sendingId, setSendingId] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/gorgias/tickets')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setTickets(data.tickets ?? []);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const classifyTicket = async (ticket: GorgiasTicket) => {
    setProcessingId(ticket.id);
    try {
      const res = await fetch('/api/ai/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: ticket.subject,
          source: ticket.source,
          ticketSubject: ticket.subject,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setTickets((prev) =>
        prev.map((t) =>
          t.id === ticket.id
            ? {
                ...t,
                escalation: data.escalation,
                escalationReason: data.escalationReason ?? undefined,
                draftReply: data.draftReply ?? data.reply,
                aiProcessed: true,
              }
            : t,
        ),
      );
      if (selected?.id === ticket.id) {
        setSelected((prev) =>
          prev
            ? { ...prev, escalation: data.escalation, draftReply: data.draftReply ?? data.reply, aiProcessed: true }
            : prev,
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Classification failed';
      alert(msg);
    } finally {
      setProcessingId(null);
    }
  };

  const sendReply = async (ticket: GorgiasTicket) => {
    if (!ticket.draftReply) return;
    setSendingId(ticket.id);
    try {
      const res = await fetch('/api/gorgias/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: ticket.id, reply: ticket.draftReply }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setTickets((prev) => prev.filter((t) => t.id !== ticket.id));
      if (selected?.id === ticket.id) setSelected(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to send reply');
    } finally {
      setSendingId(null);
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-sm text-gray-400">Loading Gorgias tickets...</div>;
  }

  if (error) {
    return (
      <div className="py-8 px-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
        <p className="font-semibold mb-1">Gorgias not configured</p>
        <p className="text-xs text-red-600">{error}</p>
        <p className="text-xs text-red-500 mt-1">Add GORGIAS_BASE_URL, GORGIAS_EMAIL, GORGIAS_API_KEY to .env</p>
      </div>
    );
  }

  if (tickets.length === 0) {
    return <div className="py-12 text-center text-sm text-gray-400">No open tickets in Gorgias</div>;
  }

  return (
    <div className="flex gap-4 h-[560px]">
      {/* Ticket list */}
      <div className="w-72 flex-shrink-0 overflow-y-auto space-y-2 pr-1">
        {tickets.map((ticket) => (
          <button
            key={ticket.id}
            onClick={() => setSelected(ticket)}
            className={`w-full text-left p-3 rounded-lg border transition-all ${
              selected?.id === ticket.id
                ? 'border-green-400 bg-green-50'
                : ticket.escalation
                ? `${escalationColors[ticket.escalation]} border`
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${getPlatformColor(ticket.source)}`}>
                {ticket.source}
              </span>
              {ticket.isUnread && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
            </div>
            <p className="text-xs font-medium text-gray-800 truncate">{ticket.subject}</p>
            <p className="text-xs text-gray-500 mt-0.5 truncate">{ticket.customerName}</p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-gray-400">{formatRelativeTime(ticket.createdAt)}</span>
              {ticket.escalation && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  ticket.escalation === 'auto' ? 'bg-green-100 text-green-700' :
                  ticket.escalation === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {ticket.escalation}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Detail panel */}
      <div className="flex-1 overflow-y-auto">
        {selected ? (
          <TicketDetail
            ticket={selected}
            isProcessing={processingId === selected.id}
            isSending={sendingId === selected.id}
            onClassify={() => classifyTicket(selected)}
            onSend={() => sendReply(selected)}
            onDraftChange={(text) =>
              setSelected((prev) => (prev ? { ...prev, draftReply: text } : prev))
            }
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            Select a ticket to view details
          </div>
        )}
      </div>
    </div>
  );
}

function TicketDetail({
  ticket,
  isProcessing,
  isSending,
  onClassify,
  onSend,
  onDraftChange,
}: {
  ticket: GorgiasTicket;
  isProcessing: boolean;
  isSending: boolean;
  onClassify: () => void;
  onSend: () => void;
  onDraftChange: (text: string) => void;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 h-full flex flex-col">
      {/* Header */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getPlatformColor(ticket.source)}`}>
            {ticket.source}
          </span>
          <span className="text-xs text-gray-400">#{ticket.id}</span>
          <span className="text-xs text-gray-400">{formatRelativeTime(ticket.createdAt)}</span>
        </div>
        <h3 className="text-sm font-semibold text-gray-900">{ticket.subject}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{ticket.customerName} · {ticket.customerEmail}</p>
        {ticket.tags.length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {ticket.tags.map((tag) => (
              <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* AI Classification */}
      {!ticket.aiProcessed ? (
        <button
          onClick={onClassify}
          disabled={isProcessing}
          className="mb-3 w-full py-2 border border-dashed border-green-400 text-green-700 text-xs font-medium rounded-lg hover:bg-green-50 transition-colors disabled:opacity-50"
        >
          {isProcessing ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Classifying with AI...
            </span>
          ) : (
            'Classify with AI →'
          )}
        </button>
      ) : ticket.escalation && (
        <div className={`mb-3 p-2 rounded-lg border text-xs ${escalationColors[ticket.escalation]}`}>
          <span className="font-semibold">{escalationLabels[ticket.escalation]}</span>
          {ticket.escalationReason && (
            <span className="text-gray-500 ml-1">· {ticket.escalationReason}</span>
          )}
        </div>
      )}

      {/* Draft reply editor */}
      {ticket.draftReply && ticket.escalation !== 'escalated' && (
        <div className="flex-1 flex flex-col">
          <label className="text-xs font-medium text-gray-600 mb-1.5">
            {ticket.escalation === 'draft' ? 'Draft reply (edit before sending):' : 'AI reply:'}
          </label>
          <textarea
            value={ticket.draftReply}
            onChange={(e) => onDraftChange(e.target.value)}
            className="flex-1 text-sm text-gray-800 border border-gray-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-green-500 leading-relaxed"
            rows={6}
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={onSend}
              disabled={isSending}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {isSending ? 'Sending...' : 'Send via Gorgias'}
            </button>
            <button
              onClick={() => navigator.clipboard.writeText(ticket.draftReply ?? '')}
              className="px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg text-xs hover:bg-gray-50"
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {ticket.escalation === 'escalated' && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-6 bg-red-50 rounded-xl border border-red-100">
            <p className="text-red-700 font-semibold text-sm">Escalated to Human Agent</p>
            <p className="text-red-500 text-xs mt-1">AI will not auto-reply to this ticket</p>
            {ticket.escalationReason && (
              <p className="text-red-400 text-xs mt-1">Reason: {ticket.escalationReason}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
