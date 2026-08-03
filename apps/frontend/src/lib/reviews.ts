import { ProductReview } from '@/types'

export const MOCK_REVIEWS: ProductReview[] = [
  {
    id: 'r-001',
    platform: 'Shopify',
    rating: 5,
    sentiment: 'positive',
    customerName: 'Emily R.',
    productName: 'Classic Cotton Tee',
    reviewText:
      'Absolutely love this shirt! The fabric is super soft and the fit is perfect. I bought three colors already. Will definitely be ordering more. Fast shipping too!',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    isHighPriority: false,
  },
  {
    id: 'r-002',
    platform: 'Amazon',
    rating: 5,
    sentiment: 'positive',
    customerName: 'James T.',
    productName: 'Premium Hoodie',
    reviewText:
      'Best hoodie I have ever owned. Thick material, great stitching, and the color stayed vibrant after multiple washes. Highly recommend this brand!',
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    isHighPriority: false,
  },
  {
    id: 'r-003',
    platform: 'Google',
    rating: 4,
    sentiment: 'positive',
    customerName: 'Priya M.',
    productName: 'Classic Cotton Tee',
    reviewText:
      'Really nice quality for the price. My only suggestion would be to add more color options — the design is great but I wish there were more choices. Otherwise very happy.',
    createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
    isHighPriority: false,
  },
  {
    id: 'r-004',
    platform: 'Shopify',
    rating: 4,
    sentiment: 'positive',
    customerName: 'Carlos V.',
    productName: 'Slim Fit Joggers',
    reviewText:
      'Good product overall. The joggers are comfortable and look stylish. The waistband could be a bit more elastic but still a solid purchase. Delivery was a bit slow though.',
    createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
    isHighPriority: false,
  },
  {
    id: 'r-005',
    platform: 'Amazon',
    rating: 3,
    sentiment: 'neutral',
    customerName: 'Lisa W.',
    productName: 'Premium Hoodie',
    reviewText:
      "The product itself is decent but the shipping took 12 days which is way too long. I almost had to cancel my order. The hoodie is fine but I won't order again if shipping doesn't improve.",
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    isHighPriority: false,
  },
  {
    id: 'r-006',
    platform: 'Shopify',
    rating: 3,
    sentiment: 'neutral',
    customerName: 'David K.',
    productName: 'Slim Fit Joggers',
    reviewText:
      'Product is okay but not what I expected from the photos. The color looks different in person — more grey than black. Shipping was also slower than advertised. Might try another item.',
    createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
    isHighPriority: false,
  },
  {
    id: 'r-007',
    platform: 'Google',
    rating: 2,
    sentiment: 'negative',
    customerName: 'Anna S.',
    productName: 'Classic Cotton Tee',
    reviewText:
      'Very disappointed. The shirt shrank significantly after the first wash despite following the care instructions. It went from a Medium to what feels like an XS. Poor quality control.',
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    isHighPriority: true,
  },
  {
    id: 'r-008',
    platform: 'Amazon',
    rating: 1,
    sentiment: 'negative',
    customerName: 'Robert F.',
    productName: 'Premium Hoodie',
    reviewText:
      'Terrible experience from start to finish. The product arrived damaged with a torn seam. Customer service took 5 days to respond. Still waiting for my replacement. Do NOT recommend. Will be leaving reviews everywhere.',
    createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    isHighPriority: true,
  },
]
