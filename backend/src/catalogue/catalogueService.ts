import type { Category, Product, ProductSource } from './types.js';

export interface MerchandisingConfig {
  /** Product IDs hand-picked as "top rated" for the home page, in display order. */
  featuredProductIds: string[];
  /** How many top-rated products to highlight on each category page. */
  categoryTopRatedCount: number;
}

export interface CategoryView {
  category: Category;
  topRated: Product[];
  others: Product[];
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

/** Highest average first; more reviews breaks ties; then id for stable output. */
export function byRatingDesc(a: Product, b: Product): number {
  return (
    b.rating.average - a.rating.average ||
    b.rating.count - a.rating.count ||
    a.id.localeCompare(b.id, undefined, { numeric: true })
  );
}

/**
 * Business rules for browsing. Knows nothing about HTTP or Fake Store.
 */
export class CatalogueService {
  constructor(
    private readonly source: ProductSource,
    private readonly merchandising: MerchandisingConfig,
  ) {}

  /**
   * Home page: the products the merchandiser chose, in their chosen order.
   * IDs that no longer exist in the source are skipped (and logged by the
   * caller) rather than breaking the home page.
   */
  async getFeatured(): Promise<{ products: Product[]; missingIds: string[] }> {
    const all = await this.source.listProducts();
    const byId = new Map(all.map((p) => [p.id, p]));
    const products: Product[] = [];
    const missingIds: string[] = [];
    for (const id of this.merchandising.featuredProductIds) {
      const product = byId.get(id);
      if (product) products.push(product);
      else missingIds.push(id);
    }
    return { products, missingIds };
  }

  async listCategories(): Promise<Category[]> {
    return this.source.listCategories();
  }

  /** Category page: top N by rating, then the rest of the category. */
  async getCategory(slug: string): Promise<CategoryView> {
    const all = await this.source.listProducts();
    const inCategory = all.filter((p) => p.category.slug === slug);
    const category = inCategory[0]?.category;
    if (!category) throw new NotFoundError(`Category "${slug}" not found`);

    const sorted = [...inCategory].sort(byRatingDesc);
    const n = this.merchandising.categoryTopRatedCount;
    return { category, topRated: sorted.slice(0, n), others: sorted.slice(n) };
  }

  /**
   * Search: case-insensitive match of *every* word in the query against the
   * product's title, description and category name.
   */
  async search(query: string): Promise<Product[]> {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return [];
    const all = await this.source.listProducts();
    return all.filter((p) => {
      const haystack = `${p.title} ${p.description} ${p.category.name}`.toLowerCase();
      return terms.every((t) => haystack.includes(t));
    });
  }

  async getProduct(id: string): Promise<Product> {
    const product = await this.source.getProduct(id);
    if (!product) throw new NotFoundError(`Product "${id}" not found`);
    return product;
  }
}
