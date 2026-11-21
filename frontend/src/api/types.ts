// Mirrors the backend's public API contract (not the upstream data source).

export interface Category {
  slug: string;
  name: string;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: { amount: number; currency: string };
  imageUrl: string;
  category: Category;
  rating: { average: number; count: number };
}

export interface CategoryView {
  category: Category;
  topRated: Product[];
  others: Product[];
}

export interface EnquiryRequest {
  productId: string;
  name: string;
  email: string;
  /** ISO 3166 country code for the phone number, e.g. "AU". */
  phoneCountry?: string;
  /** National number, without the country calling code. */
  phone?: string;
  message?: string;
  /** Honeypot: always empty for real users. */
  website?: string;
}

export type FieldErrors = Partial<Record<keyof EnquiryRequest, string[]>>;
