import { NextResponse } from 'next/server'
import { fetchProducts } from '@/lib/shopify'

export async function GET() {
  try {
    const products = await fetchProducts(20)
    return NextResponse.json({ products })
  } catch (err) {
    console.error('Products API error:', err)
    return NextResponse.json({ error: 'Failed to load products' }, { status: 500 })
  }
}
