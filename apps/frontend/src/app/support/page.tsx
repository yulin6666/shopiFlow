'use client'

import { useState, useEffect } from 'react'
import { SupportTicket } from '@/types'
import { TicketList } from '@/components/support/TicketList'
import { TicketDetail } from '@/components/support/TicketDetail'

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [selected, setSelected] = useState<SupportTicket | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/shopify/orders')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error)
        setTickets(data.tickets)
        setSelected(data.tickets[0] ?? null)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex h-full">
      {/* Left panel */}
      <div className="w-72 border-r flex flex-col">
        <div className="px-4 py-4 border-b">
          <h1 className="font-semibold text-sm">AI Support Center</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {loading ? 'Loading...' : `${tickets.length} tickets`}
          </p>
        </div>

        {error && (
          <div className="m-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}

        <TicketList
          tickets={tickets}
          selected={selected}
          onSelect={setSelected}
          loading={loading}
        />
      </div>

      {/* Right panel */}
      <div className="flex-1 overflow-auto">
        {selected ? (
          <TicketDetail ticket={selected} />
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            {loading ? 'Loading tickets...' : 'Select a ticket to view details'}
          </div>
        )}
      </div>
    </div>
  )
}
