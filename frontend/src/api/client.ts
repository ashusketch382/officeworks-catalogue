import type { Category, CategoryView, EnquiryRequest, FieldErrors, Product } from './types';

/**
 * The only module that knows about HTTP. Pages call these functions, so a
 * change of backend URL, auth or transport stays in one place.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fieldErrors?: FieldErrors,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { accept: 'application/json', ...(init?.body ? { 'content-type': 'application/json' } : {}) },
    });
  } catch {
    throw new ApiError('Could not reach the server. Check your connection and try again.', 0);
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(body.message ?? 'Something went wrong.', res.status, body.details);
  }
  return body as T;
}

export const api = {
  getFeatured: () => request<{ products: Product[] }>('/products/featured').then((r) => r.products),
  getCategories: () => request<{ categories: Category[] }>('/categories').then((r) => r.categories),
  getCategory: (slug: string) => request<CategoryView>(`/categories/${encodeURIComponent(slug)}`),
  search: (q: string) =>
    request<{ products: Product[] }>(`/products/search?q=${encodeURIComponent(q)}`).then((r) => r.products),
  getProduct: (id: string) => request<{ product: Product }>(`/products/${encodeURIComponent(id)}`).then((r) => r.product),
  submitEnquiry: (enquiry: EnquiryRequest) =>
    request<{ message: string }>('/enquiries', { method: 'POST', body: JSON.stringify(enquiry) }),
};

export type Api = typeof api;
