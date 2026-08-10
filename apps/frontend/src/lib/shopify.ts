import { ShopifyOrder, ShopifyProduct } from '@/types';

const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

const shopifyFetch = async <T>(endpoint: string): Promise<T> => {
  if (!SHOPIFY_DOMAIN || !SHOPIFY_TOKEN) {
    throw new Error('Shopify credentials not configured');
  }

  const url = `https://${SHOPIFY_DOMAIN}/admin/api/2024-07/${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'X-Shopify-Access-Token': SHOPIFY_TOKEN,
      'Content-Type': 'application/json',
    },
    next: { revalidate: 60 }, // cache 60s
  });

  if (!response.ok) {
    throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
};

export async function getOrders(limit = 20): Promise<ShopifyOrder[]> {
  const data = await shopifyFetch<{ orders: ShopifyOrder[] }>(
    `orders.json?limit=${limit}&status=any`,
  );
  return data.orders;
}

export async function getOrder(orderId: string): Promise<ShopifyOrder> {
  const data = await shopifyFetch<{ order: ShopifyOrder }>(`orders/${orderId}.json`);
  return data.order;
}

export async function getProducts(limit = 20): Promise<ShopifyProduct[]> {
  const data = await shopifyFetch<{ products: ShopifyProduct[] }>(
    `products.json?limit=${limit}&status=active`,
  );
  return data.products;
}

// Lookup order by name/number for support chat
export async function findOrderByName(orderName: string): Promise<ShopifyOrder | null> {
  // Remove # prefix if present
  const name = orderName.replace(/^#/, '');
  try {
    const data = await shopifyFetch<{ orders: ShopifyOrder[] }>(
      `orders.json?name=${encodeURIComponent(name)}&status=any`,
    );
    return data.orders?.[0] ?? null;
  } catch {
    return null;
  }
}
