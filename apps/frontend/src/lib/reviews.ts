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
    title: '超级有效！',
    content:
      '用了两个月，皮肤状态明显改善，朋友都说我看起来更有气色了。包装也很高档，送礼自用两相宜。强烈推荐！',
    date: '2026-07-22',
    productName: 'Collagen Glow Complex',
    language: 'zh',
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
    title: '¡Excelente producto!',
    content:
      'Llevo 6 semanas tomando este suplemento y los resultados son increíbles. Más energía, mejor humor y duermo como un bebé. El precio es muy razonable para la calidad que ofrece.',
    date: '2026-07-18',
    productName: 'Daily Wellness Bundle',
    language: 'es',
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
    title: 'リピート確定！',
    content:
      '毎日飲み続けて1ヶ月。疲れにくくなり、肌の調子も上がりました。成分がしっかりしていて安心感があります。次回はまとめ買いする予定です。',
    date: '2026-07-12',
    productName: 'Collagen Glow Complex',
    language: 'ja',
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
