/**
 * Published market insights.
 *
 * The articles below were first published on the previous Pluck Live site — this
 * platform's earlier name — and are reproduced here with their original titles,
 * excerpts and body text. Product references inside the body have been updated
 * to the current name; everything else is unchanged.
 *
 * The live site did not display a publication date for them, so `publishedAt`
 * is `null` and the UI says so rather than inventing one. The fuel-price piece
 * was advertised on the live homepage with a date of 9 October 2025, which is
 * the only date we can verify.
 *
 * When Supabase is configured these articles are managed in the `articles`
 * table and the same endpoints read from there instead.
 */

export interface Insight {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  body: string[];
  publishedAt: string | null;
  readingMinutes: number;
  author: string;
}

export const insights: Insight[] = [
  {
    slug: 'future-of-sustainable-farming-in-nigeria',
    title: 'The Future of Sustainable Farming in Nigeria',
    excerpt:
      'Sustainable agriculture is more than just a buzzword; it’s a necessity for the future of food security in Nigeria. This post explores innovative techniques being adopted by local farmers, from advanced crop rotation to water conservation methods.',
    category: 'Sustainability',
    body: [
      'Sustainable agriculture is more than just a buzzword; it’s a necessity for the future of food security in Nigeria. This post explores innovative techniques being adopted by local farmers, from advanced crop rotation to water conservation methods. We delve into how these practices not only yield healthier soil, but also contribute to long-term economic resilience for farming households.',
      'Join us as we visit a model farm in Oyo State that has successfully integrated these methods, increasing their yield by over 40% while reducing their carbon footprint.',
      'For the producers we work with, the practical question is always the same: does the change pay? A practice that raises yields but doubles labour cost is not accessible to most smallholders, and a practice that saves water but halves the marketable grade is worse than no change at all. Hatsi360 tracks prices precisely so that these decisions can be made against evidence rather than assumption.',
    ],
    publishedAt: null,
    readingMinutes: 4,
    author: 'Hatsi360 Research',
  },
  {
    slug: 'guide-to-yam-cultivation-for-maximum-yield',
    title: 'A Guide to Yam Cultivation for Maximum Yield',
    excerpt:
      'Yam is a staple food in West Africa, and its successful cultivation is key to the livelihood of millions. This comprehensive guide covers everything from selecting the right yam setts to proper spacing, soil management, and pest control.',
    category: 'Cultivation',
    body: [
      'Yam is a staple food in West Africa, and its successful cultivation is key to the livelihood of millions. This comprehensive guide covers everything from selecting the right yam setts to proper spacing, soil management, and pest control. Whether you are a small-scale farmer or a commercial producer, the fundamentals are the same.',
      'Three things consistently separate the highest-yielding plots from the average ones:',
      'Soil preparation is crucial.',
      'Timing of planting affects yield significantly.',
      'Integrated pest management is more effective than chemical pesticides alone.',
      'Yam is also a market with strong seasonal shape. Prices at the major yam markets reflect supply timing as much as they reflect demand, so a producer who knows the seasonal pattern of their own market is better placed to decide when to sell.',
    ],
    publishedAt: null,
    readingMinutes: 5,
    author: 'Hatsi360 Research',
  },
  {
    slug: 'understanding-market-price-fluctuations-for-cassava',
    title: 'Understanding Market Price Fluctuations for Cassava',
    excerpt:
      'Why did the price of Garri increase last month? This article breaks down the complex factors that influence the market price of cassava and its derivatives — seasonal trends, transportation costs, government policies, and international demand.',
    category: 'Market Analysis',
    body: [
      'Why did the price of Garri increase last month? This article breaks down the complex factors that influence the market price of cassava and its derivatives. We analyze seasonal trends, transportation costs, government policies, and international demand to give you a clearer picture of the market dynamics at play.',
      'By understanding these trends, farmers can make more informed decisions about when to sell their produce for the best possible price.',
      'It is worth being clear about what a price series can and cannot tell you. A published series shows what was observed at a market on a given day — it does not by itself explain why the price moved. Explaining a move requires context: harvest timing, fuel costs, road conditions, policy changes and what is happening in neighbouring markets. That is the context our agents record alongside each observation.',
    ],
    publishedAt: null,
    readingMinutes: 4,
    author: 'Hatsi360 Research',
  },
  {
    slug: 'impact-of-fuel-prices-on-food-transportation',
    title: 'The Impact of Fuel Prices on Food Transportation',
    excerpt:
      'A deep dive into how fluctuating fuel costs affect the price of food items across Nigeria, and what it means for farmgate and wholesale prices.',
    category: 'Market Analysis',
    body: [
      'A deep dive into how fluctuating fuel costs are affecting the price of food items across Nigeria.',
      'Transport is a large share of the cost of moving agricultural produce from farm to market. When the price of diesel rises, that cost is passed along the chain in stages — from the transporter to the wholesaler to the retailer — and the lag between the fuel move and the shelf move varies by commodity and by distance travelled.',
      'The practical consequence is that the same commodity can move very differently across the country in the same week. A market close to a producing region sees far less transport cost than a market hundreds of kilometres away, which is one reason a national average price can mislead. The comparison view on this site keeps the market attached to every figure for exactly this reason.',
      'We do not publish forecasts. Where we publish analysis, we tell you what was observed and when, and we separate the observation from the interpretation.',
    ],
    publishedAt: '2025-10-09',
    readingMinutes: 5,
    author: 'Hatsi360 Research',
  },
];

export function getInsight(slug: string): Insight | null {
  return insights.find((article) => article.slug === slug) ?? null;
}
