import { ShopifyOrder, ShopifyProduct } from '@/types'

const BASE_URL = `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2024-04`
const HEADERS = {
  'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN!,
  'Content-Type': 'application/json',
}

export async function fetchOrders(limit = 20): Promise<ShopifyOrder[]> {
  const res = await fetch(`${BASE_URL}/orders.json?limit=${limit}&status=any`, {
    headers: HEADERS,
    next: { revalidate: 60 },
  })
  if (!res.ok) throw new Error(`Shopify orders fetch failed: ${res.status}`)
  const data = await res.json()
  return data.orders
}

export async function fetchProducts(limit = 20): Promise<ShopifyProduct[]> {
  const res = await fetch(`${BASE_URL}/products.json?limit=${limit}`, {
    headers: HEADERS,
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`Shopify products fetch failed: ${res.status}`)
  const data = await res.json()
  return data.products
}
