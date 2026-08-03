import { NextResponse } from 'next/server'
import { fetchOrders } from '@/lib/shopify'
import { buildTicketsFromOrders } from '@/lib/tickets'

export async function GET() {
  try {
    const orders = await fetchOrders(20)
    const tickets = buildTicketsFromOrders(orders)
    return NextResponse.json({ tickets })
  } catch (err) {
    console.error('Support tickets API error:', err)
    return NextResponse.json({ error: 'Failed to load tickets' }, { status: 500 })
  }
}
