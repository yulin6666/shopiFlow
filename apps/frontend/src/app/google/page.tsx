'use client';

import { useState, CSSProperties } from 'react';

const C = {
  bg: '#F4F6FB',
  surface: '#FFFFFF',
  border: '#E4E7F0',
  text: '#111827',
  muted: '#6B7280',
  subtle: '#9CA3AF',
  green: '#10B981',
  greenLight: '#ECFDF5',
  red: '#EF4444',
  redLight: '#FEF2F2',
  grayLight: '#F3F4F6',
};

export default function GooglePage() {
  const [gmailAccount, setGmailAccount] = useState('linyubupt@gmail.com');
  const [gmailLabel, setGmailLabel] = useState('GmailFlow-Test');
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleProcess() {
    setProcessing(true);
    setMessage('');
    setSuccess(false);
    try {
      const res = await fetch('/api/google/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gmail_account: gmailAccount,
          gmail_label: gmailLabel,
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setMessage(json.message || '处理完成');
      setSuccess(true);
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : '处理失败');
      setSuccess(false);
    } finally {
      setProcessing(false);
    }
  }

  const inputStyle: CSSProperties = {
    width: '100%',
    padding: '9px 12px',
    fontSize: 14,
    border: `1.5px solid ${C.border}`,
    borderRadius: 10,
    outline: 'none',
    color: C.text,
    background: C.bg,
    boxSizing: 'border-box',
  };

  const btnPrimary: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 20px',
    background: C.green,
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    cursor: processing ? 'wait' : 'pointer',
    opacity: processing ? 0.75 : 1,
    transition: 'opacity 0.15s',
    boxShadow: '0 2px 8px rgba(16,185,129,0.25)',
    whiteSpace: 'nowrap' as const,
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Header */}
        <div>
          <div style={{ fontSize: 24, fontWeight: 700, color: C.text }}>Gmail Configuration</div>
          <div style={{ fontSize: 14, color: C.muted, marginTop: 6 }}>
            Configure Gmail account and label to process support emails
          </div>
        </div>

        {/* Gmail Config */}
        <div style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          padding: 24,
          boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
        }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>📧</span>
              Gmail Settings
            </div>
            <div style={{ fontSize: 13, color: C.subtle, marginTop: 3 }}>
              Emails with this label will be processed by AI
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Gmail Account
              </div>
              <input
                style={inputStyle}
                type="email"
                value={gmailAccount}
                onChange={e => setGmailAccount(e.target.value)}
                placeholder="you@gmail.com"
              />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Gmail Label
              </div>
              <input
                style={inputStyle}
                value={gmailLabel}
                onChange={e => setGmailLabel(e.target.value)}
                placeholder="e.g. GmailFlow-Test"
              />
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div>
          <button onClick={handleProcess} disabled={processing} style={btnPrimary}>
            {processing ? (
              <span style={{
                display: 'inline-block',
                animation: 'spin 1s linear infinite',
                width: 14,
                height: 14,
                border: '2px solid rgba(255,255,255,0.4)',
                borderTopColor: '#fff',
                borderRadius: '50%',
              }} />
            ) : '⚡'}
            {processing ? 'Processing...' : 'Process Now'}
          </button>
          {message && (
            <div style={{
              marginTop: 12,
              padding: '8px 12px',
              borderRadius: 8,
              fontSize: 13,
              background: success ? C.greenLight : C.redLight,
              color: success ? C.green : C.red,
              border: `1px solid ${success ? '#A7F3D0' : '#FCA5A5'}`,
            }}>
              {success ? '✓ ' : '✕ '}{message}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        button:hover:not(:disabled) { opacity: 0.88; }
      `}</style>
    </div>
  );
}
