/**
 * Domain model for the catalogue.
 *
 * These types are owned by *our* backend, not by the upstream data source.
 * The Fake Store API shape is mapped into these in the adapter, so swapping the
 * data source (a PIM, a commerce platform, a database) only means writing a new
 * `ProductSource` implementation — routes, services and the client stay the same.
 */

export interface Category {
  /** URL-safe identifier, e.g. "mens-clothing". */
  slug: string;
  /** Display name, e.g. "Men's clothing". */
  name: string;
}

export interface Rating {
  /** Average score, 0–5. */
  average: number;
  /** Number of reviews behind the average. */
  count: number;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: { amount: number; currency: string };
  imageUrl: string;
  category: Category;
  rating: Rating;
}

/** Port: anything that can supply products. Implemented by adapters. */
export interface ProductSource {
  listProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  listCategories(): Promise<Category[]>;
}
