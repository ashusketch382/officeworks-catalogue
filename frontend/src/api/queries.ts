import { QueryClient, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from './client';
import type { Product } from './types';

/**
 * Data fetching for pages. TanStack Query gives us, for free:
 * - de-duplication: identical in-flight requests share one network call
 *   (including React StrictMode's double mount in development);
 * - caching: revisiting a page within `staleTime` shows cached data with no call;
 * - out-of-order protection when inputs change quickly.
 */

export const queryKeys = {
  featured: ['products', 'featured'] as const,
  categories: ['categories'] as const,
  category: (slug: string) => ['categories', slug] as const,
  search: (q: string) => ['products', 'search', q] as const,
  product: (id: string) => ['products', 'detail', id] as const,
};

/** Matches the backend's product cache TTL: catalogue data changes slowly. */
const STALE_TIME_MS = 5 * 60 * 1000;

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIME_MS,
        refetchOnWindowFocus: false,
        // Retry once on network/5xx errors; a 4xx (e.g. unknown product) won't change on retry.
        retry: (failureCount, error) =>
          failureCount < 1 && !(error instanceof ApiError && error.status >= 400 && error.status < 500),
      },
    },
  });
}

/**
 * Lists already contain full product data, so store each product under its
 * detail key. Opening a product from a list then needs no extra API call.
 */
function seedProducts(client: QueryClient, products: Product[]): Product[] {
  for (const p of products) client.setQueryData(queryKeys.product(p.id), p);
  return products;
}

export function useFeatured() {
  const client = useQueryClient();
  return useQuery({
    queryKey: queryKeys.featured,
    queryFn: async () => seedProducts(client, await api.getFeatured()),
  });
}

export function useCategories() {
  return useQuery({ queryKey: queryKeys.categories, queryFn: api.getCategories });
}

export function useCategory(slug: string) {
  const client = useQueryClient();
  return useQuery({
    queryKey: queryKeys.category(slug),
    queryFn: async () => {
      const view = await api.getCategory(slug);
      seedProducts(client, [...view.topRated, ...view.others]);
      return view;
    },
  });
}

export function useSearch(q: string) {
  const client = useQueryClient();
  return useQuery({
    queryKey: queryKeys.search(q),
    queryFn: async () => seedProducts(client, await api.search(q)),
    enabled: q.length > 0,
  });
}

export function useProduct(id: string) {
  return useQuery({ queryKey: queryKeys.product(id), queryFn: () => api.getProduct(id) });
}
