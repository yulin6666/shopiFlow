import { Review } from '@/types';

// 8 mock reviews covering Shopify/Amazon/TikTok, multiple languages
export const mockReviews: Review[] = [
  {
    id: 'rev-001',
    platform: 'shopify',
    author: 'Sarah Mitchell',
    rating: 5,
    title: 'Amazing results after 3 weeks!',
    content:
      'I was skeptical at first but these supplements have genuinely made a difference. My energy levels are up, sleep is better, and I feel more focused throughout the day. Will definitely reorder!',
    date: '2026-07-28',
    productName: 'Daily Wellness Bundle',
    language: 'en',
    status: 'pending',
  },
  {
    id: 'rev-002',
    platform: 'amazon',
    author: 'James T.',
    rating: 4,
    title: 'Good product, slow shipping',
    content:
      'The product itself is great — noticed improvements in about 2 weeks. Docking one star because shipping took 9 days and the packaging was slightly damaged. Product was fine though.',
    date: '2026-07-25',
    productName: 'Omega-3 Fish Oil 1000mg',
    language: 'en',
    status: 'pending',
  },
  {
    id: 'rev-003',
    platform: 'tiktok',
    author: 'liu_wellness',
    rating: 5,
    title: 'Skin looks amazing!',
    content:
      'Been using this for two months and my skin has improved so much. Friends keep asking what I changed in my routine. Packaging is beautiful too — great as a gift or for yourself. Highly recommend!',
    date: '2026-07-22',
    productName: 'Collagen Glow Complex',
    language: 'en',
    status: 'pending',
  },
  {
    id: 'rev-004',
    platform: 'shopify',
    author: 'Emma Kowalski',
    rating: 3,
    title: 'Decent but expected more',
    content:
      'Been taking it for a month. Some improvement in energy but nothing dramatic. The capsules are large and hard to swallow. Customer service was helpful when I had questions.',
    date: '2026-07-20',
    productName: 'Daily Wellness Bundle',
    language: 'en',
    status: 'pending',
  },
  {
    id: 'rev-005',
    platform: 'amazon',
    author: 'Carlos R.',
    rating: 5,
    title: 'Excellent product!',
    content:
      "Been taking this supplement for 6 weeks and the results are incredible. More energy, better mood, and sleeping great. The price is very reasonable for the quality you get.",
    date: '2026-07-18',
    productName: 'Daily Wellness Bundle',
    language: 'en',
    status: 'pending',
  },
  {
    id: 'rev-006',
    platform: 'tiktok',
    author: 'petprinted_fan',
    rating: 2,
    title: 'Not what I expected',
    content:
      'Ordered based on the TikTok ads but the product is quite different from what was shown. The scent is overwhelming and gave me a headache. Hoping to get a refund.',
    date: '2026-07-15',
    productName: 'Relaxation Blend',
    language: 'en',
    status: 'pending',
  },
  {
    id: 'rev-007',
    platform: 'shopify',
    author: 'Yuki Tanaka',
    rating: 5,
    title: 'Definitely reordering!',
    content:
      'One month in and I feel so much less tired throughout the day. My skin has also improved noticeably. The ingredients list is reassuring — clean and high quality. Will be buying in bulk next time.',
    date: '2026-07-12',
    productName: 'Collagen Glow Complex',
    language: 'en',
    status: 'pending',
  },
  {
    id: 'rev-008',
    platform: 'amazon',
    author: 'Michael B.',
    rating: 4,
    title: 'Great for post-workout recovery',
    content:
      'Been using this alongside my gym routine for 5 weeks. Recovery time has noticeably improved. I take it every morning with breakfast. Tastes a bit chalky but nothing a glass of OJ cant fix.',
    date: '2026-07-10',
    productName: 'Omega-3 Fish Oil 1000mg',
    language: 'en',
    status: 'pending',
  },
];
