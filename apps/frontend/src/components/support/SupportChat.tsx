'use client';

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { ChatMessage, EscalationLevel } from '@/types';
import { generateId } from '@/lib/utils';
import { SUPPORT_ESCALATION_MESSAGES } from '@/lib/prompts';

function getEscalationColor(escalation: EscalationLevel) {
  switch (escalation) {
    case 'auto':
      return 'bg-green-100 text-green-800';
    case 'draft':
      return 'bg-amber-100 text-amber-800';
    case 'escalated':
      return 'bg-red-100 text-red-800';
  }
}

export interface SupportChatRef {
  sendMessage: (text: string) => void;
}

const SupportChat = forwardRef<SupportChatRef>((props, ref) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editingDraft, setEditingDraft] = useState<{ messageId: string; text: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
      source: 'shopify',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, source: 'shopify' }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Request failed');

      const assistantMsg: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: data.escalation === 'escalated' ? SUPPORT_ESCALATION_MESSAGES.escalated : data.reply,
        timestamp: new Date().toISOString(),
        escalation: data.escalation,
        escalationReason: data.escalationReason ?? undefined,
        draftReply: data.draftReply ?? undefined,
        source: 'shopify',
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      setMessages((prev) => [
        ...prev,
        { id: generateId(), role: 'assistant', content: `Error: ${errMsg}`, timestamp: new Date().toISOString() },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveDraft = (messageId: string, finalText: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, content: finalText, escalation: 'auto' as EscalationLevel }
          : m
      )
    );
    setEditingDraft(null);
  };

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    sendMessage,
  }));

  return (
    <div className="flex flex-col h-[600px]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-20">
            <p>Ask a question to get started</p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] ${
                msg.role === 'user' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-900'
              } rounded-lg px-4 py-2`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>

              {msg.escalation && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`px-2 py-0.5 rounded ${getEscalationColor(msg.escalation)}`}>
                      {msg.escalation === 'auto'
                        ? 'Auto-replied'
                        : msg.escalation === 'draft'
                        ? 'Draft for review'
                        : 'Escalated to human'}
                    </span>
                  </div>
                  {msg.escalationReason && <p className="text-xs text-gray-600 mt-1">{msg.escalationReason}</p>}
                </div>
              )}

              {msg.draftReply && msg.escalation === 'draft' && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  {editingDraft?.messageId === msg.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editingDraft.text}
                        onChange={(e) => setEditingDraft({ ...editingDraft, text: e.target.value })}
                        className="w-full text-sm p-2 border rounded resize-none"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApproveDraft(msg.id, editingDraft.text)}
                          className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => setEditingDraft(null)}
                          className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-1">Draft reply:</p>
                      <p className="text-xs text-gray-600 italic">{msg.draftReply}</p>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleApproveDraft(msg.id, msg.draftReply!)}
                          className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => setEditingDraft({ messageId: msg.id, text: msg.draftReply! })}
                          className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage(input);
        }}
        className="border-t border-gray-200 p-4 flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a customer message..."
          className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
});

SupportChat.displayName = 'SupportChat';

export default SupportChat;
