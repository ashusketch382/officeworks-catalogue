import type { Product } from '../src/api/types';

export function makeProduct(id: string, title: string): Product {
  return {
    id,
    title,
    description: `${title} description`,
    price: { amount: 19.95, currency: 'AUD' },
    imageUrl: 'https://example.com/img.png',
    category: { slug: 'electronics', name: 'Electronics' },
    rating: { average: 4.5, count: 100 },
  };
}
