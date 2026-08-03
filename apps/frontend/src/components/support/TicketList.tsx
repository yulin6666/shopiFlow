import { SupportTicket, TicketPriority, TicketChannel } from '@/types'
import { Badge } from '@/components/ui/Badge'
import { formatRelativeTime } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface TicketListProps {
  tickets: SupportTicket[]
  selected: SupportTicket | null
  onSelect: (t: SupportTicket) => void
  loading: boolean
}

const PRIORITY_VARIANT: Record<TicketPriority, 'destructive' | 'warning' | 'secondary'> = {
  high: 'destructive',
  medium: 'warning',
  low: 'secondary',
}

const CHANNEL_VARIANT: Record<TicketChannel, 'default' | 'warning' | 'secondary'> = {
  Shopify: 'default',
  Amazon: 'warning',
  'TikTok Shop': 'secondary',
}

export function TicketList({ tickets, selected, onSelect, loading }: TicketListProps) {
  if (loading) {
    return (
      <div className="flex-1 p-4 space-y-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto">
      {tickets.map((ticket) => (
        <button
          key={ticket.id}
          onClick={() => onSelect(ticket)}
          className={cn(
            'w-full text-left px-4 py-3 border-b transition-colors hover:bg-accent',
            selected?.id === ticket.id && 'bg-primary/5 border-l-2 border-l-primary'
          )}
        >
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-xs font-medium leading-snug line-clamp-1">{ticket.subject}</p>
            <Badge variant={PRIORITY_VARIANT[ticket.priority]} className="shrink-0">
              {ticket.priority}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-1 mb-1.5">
            {ticket.customerName}
          </p>
          <div className="flex items-center gap-2">
            <Badge variant={CHANNEL_VARIANT[ticket.channel]}>{ticket.channel}</Badge>
            <span className="text-xs text-muted-foreground ml-auto">
              {formatRelativeTime(ticket.createdAt)}
            </span>
          </div>
        </button>
      ))}
    </div>
  )
}
