import { z } from 'zod';
import { toDisplayName, toSlug } from './slug.js';
import type { Category, Product, ProductSource } from './types.js';

/**
 * Adapter: Fake Store API -> our domain model.
 *
 * - Validates the upstream payload with zod, so a breaking change upstream
 *   fails loudly here instead of leaking malformed data to the client.
 * - Fake Store has no search or pagination, and only 20 products, so the
 *   whole list is fetched once and cached in memory for `cacheTtlMs`.
 *   A real source with server-side search would get its own adapter.
 */

const fakeStoreProductSchema = z.object({
  id: z.number(),
  title: z.string(),
  price: z.number(),
  description: z.string(),
  category: z.string(),
  image: z.string().url(),
  rating: z
    .object({ rate: z.number(), count: z.number() })
    .default({ rate: 0, count: 0 }),
});

type FakeStoreProduct = z.infer<typeof fakeStoreProductSchema>;

export class UpstreamError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'UpstreamError';
  }
}

export interface FakeStoreSourceOptions {
  baseUrl: string;
  timeoutMs: number;
  cacheTtlMs: number;
  currency: string;
  /** Injected for tests; defaults to global fetch. */
  fetchFn?: typeof fetch;
  /** Injected for tests; defaults to Date.now. */
  now?: () => number;
}

export class FakeStoreSource implements ProductSource {
  private cache?: { products: Product[]; expiresAt: number };
  private inFlight?: Promise<Product[]>;
  private readonly fetchFn: typeof fetch;
  private readonly now: () => number;

  constructor(private readonly options: FakeStoreSourceOptions) {
    this.fetchFn = options.fetchFn ?? fetch;
    this.now = options.now ?? Date.now;
  }

  async listProducts(): Promise<Product[]> {
    if (this.cache && this.cache.expiresAt > this.now()) {
      return this.cache.products;
    }
    // De-duplicate concurrent cold-cache requests into one upstream call.
    this.inFlight ??= this.fetchAll().finally(() => {
      this.inFlight = undefined;
    });
    return this.inFlight;
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const products = await this.listProducts();
    return products.find((p) => p.id === id);
  }

  async listCategories(): Promise<Category[]> {
    const products = await this.listProducts();
    const bySlug = new Map<string, Category>();
    for (const p of products) bySlug.set(p.category.slug, p.category);
    return [...bySlug.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  private async fetchAll(): Promise<Product[]> {
    const url = `${this.options.baseUrl.replace(/\/$/, '')}/products`;
    let response: Response;
    try {
      response = await this.fetchFn(url, {
        signal: AbortSignal.timeout(this.options.timeoutMs),
        headers: { accept: 'application/json' },
      });
    } catch (cause) {
      throw new UpstreamError('Product source is unreachable', { cause });
    }
    if (!response.ok) {
      throw new UpstreamError(`Product source responded with ${response.status}`);
    }

    const parsed = z.array(fakeStoreProductSchema).safeParse(await response.json());
    if (!parsed.success) {
      throw new UpstreamError('Product source returned an unexpected payload', {
        cause: parsed.error,
      });
    }

    const products = parsed.data.map((p) => this.toProduct(p));
    this.cache = { products, expiresAt: this.now() + this.options.cacheTtlMs };
    return products;
  }

  private toProduct(p: FakeStoreProduct): Product {
    return {
      id: String(p.id),
      title: p.title.trim(),
      description: p.description.trim(),
      price: { amount: p.price, currency: this.options.currency },
      imageUrl: p.image,
      category: { slug: toSlug(p.category), name: toDisplayName(p.category) },
      rating: { average: p.rating.rate, count: p.rating.count },
    };
  }
}
