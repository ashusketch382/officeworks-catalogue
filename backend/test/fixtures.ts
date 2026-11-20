import type { Category, Product, ProductSource } from '../src/catalogue/types.js';
import type { EmailMessage, EmailProvider } from '../src/enquiry/emailProvider.js';

const electronics: Category = { slug: 'electronics', name: 'Electronics' };
const jewelery: Category = { slug: 'jewelery', name: 'Jewelery' };

export function makeProduct(overrides: Partial<Product> & { id: string }): Product {
  return {
    title: `Product ${overrides.id}`,
    description: 'A product',
    price: { amount: 10, currency: 'AUD' },
    imageUrl: 'https://example.com/img.png',
    category: electronics,
    rating: { average: 3, count: 10 },
    ...overrides,
  };
}

export const sampleProducts: Product[] = [
  makeProduct({ id: '1', title: 'Portable SSD 1TB', rating: { average: 4.8, count: 400 } }),
  makeProduct({ id: '2', title: 'Gaming Monitor', description: 'Curved 49 inch screen', rating: { average: 2.2, count: 140 } }),
  makeProduct({ id: '3', title: 'External Hard Drive', rating: { average: 4.8, count: 319 } }),
  makeProduct({ id: '4', title: 'USB Hub', rating: { average: 3.5, count: 50 } }),
  makeProduct({ id: '5', title: 'Gold Ring', category: jewelery, rating: { average: 4.6, count: 400 } }),
  makeProduct({ id: '6', title: 'Silver Bracelet', category: jewelery, rating: { average: 1.9, count: 100 } }),
];

/** In-memory ProductSource: proves the service works with any adapter. */
export class InMemorySource implements ProductSource {
  constructor(private readonly products: Product[] = sampleProducts) {}
  async listProducts() {
    return this.products;
  }
  async getProduct(id: string) {
    return this.products.find((p) => p.id === id);
  }
  async listCategories() {
    const map = new Map(this.products.map((p) => [p.category.slug, p.category]));
    return [...map.values()];
  }
}

export class RecordingEmailProvider implements EmailProvider {
  readonly name = 'recording';
  readonly sent: EmailMessage[] = [];
  async send(message: EmailMessage) {
    this.sent.push(message);
  }
}
