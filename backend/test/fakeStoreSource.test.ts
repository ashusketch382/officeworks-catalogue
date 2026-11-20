import { describe, expect, it, vi } from 'vitest';
import { FakeStoreSource, UpstreamError } from '../src/catalogue/fakeStoreSource.js';

const upstreamProducts = [
  {
    id: 1,
    title: ' Mens Cotton Jacket ',
    price: 55.99,
    description: 'Warm jacket',
    category: "men's clothing",
    image: 'https://fakestoreapi.com/img/1.jpg',
    rating: { rate: 4.7, count: 500 },
  },
];

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function makeSource(fetchFn: typeof fetch, now = () => 0) {
  return new FakeStoreSource({
    baseUrl: 'https://upstream.test/',
    timeoutMs: 1000,
    cacheTtlMs: 60_000,
    currency: 'AUD',
    fetchFn,
    now,
  });
}

describe('FakeStoreSource', () => {
  it('maps the upstream shape into the domain model', async () => {
    const source = makeSource(vi.fn(async () => jsonResponse(upstreamProducts)));
    const [product] = await source.listProducts();
    expect(product).toEqual({
      id: '1',
      title: 'Mens Cotton Jacket',
      description: 'Warm jacket',
      price: { amount: 55.99, currency: 'AUD' },
      imageUrl: 'https://fakestoreapi.com/img/1.jpg',
      category: { slug: 'mens-clothing', name: "Men's clothing" },
      rating: { average: 4.7, count: 500 },
    });
  });

  it('caches results until the TTL expires', async () => {
    let time = 0;
    const fetchFn = vi.fn(async () => jsonResponse(upstreamProducts));
    const source = makeSource(fetchFn, () => time);

    await source.listProducts();
    await source.listProducts();
    expect(fetchFn).toHaveBeenCalledTimes(1);

    time = 60_001;
    await source.listProducts();
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('shares one upstream call between concurrent cold requests', async () => {
    const fetchFn = vi.fn(async () => jsonResponse(upstreamProducts));
    const source = makeSource(fetchFn);
    await Promise.all([source.listProducts(), source.getProduct('1'), source.listCategories()]);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('throws UpstreamError on a non-2xx response', async () => {
    const source = makeSource(vi.fn(async () => jsonResponse({}, 503)));
    await expect(source.listProducts()).rejects.toBeInstanceOf(UpstreamError);
  });

  it('throws UpstreamError when the payload shape is unexpected', async () => {
    const source = makeSource(vi.fn(async () => jsonResponse([{ id: 'not-a-number' }])));
    await expect(source.listProducts()).rejects.toBeInstanceOf(UpstreamError);
  });

  it('throws UpstreamError when the network call fails', async () => {
    const source = makeSource(vi.fn(async () => Promise.reject(new TypeError('fetch failed'))));
    await expect(source.listProducts()).rejects.toBeInstanceOf(UpstreamError);
  });
});
