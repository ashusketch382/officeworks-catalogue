import { describe, expect, it } from 'vitest';
import { CatalogueService, NotFoundError } from '../src/catalogue/catalogueService.js';
import { InMemorySource } from './fixtures.js';

const service = (featuredProductIds = ['5', '1', '3'], categoryTopRatedCount = 2) =>
  new CatalogueService(new InMemorySource(), { featuredProductIds, categoryTopRatedCount });

describe('CatalogueService', () => {
  describe('getFeatured (home page)', () => {
    it('returns exactly the chosen products, in the chosen order', async () => {
      const { products } = await service().getFeatured();
      expect(products.map((p) => p.id)).toEqual(['5', '1', '3']);
    });

    it('skips and reports chosen IDs that no longer exist instead of failing', async () => {
      const { products, missingIds } = await service(['1', '999']).getFeatured();
      expect(products.map((p) => p.id)).toEqual(['1']);
      expect(missingIds).toEqual(['999']);
    });
  });

  describe('getCategory', () => {
    it('splits a category into top rated and the remaining products', async () => {
      const view = await service().getCategory('electronics');
      expect(view.category.name).toBe('Electronics');
      // 1 and 3 tie on 4.8; 1 has more reviews so it ranks first.
      expect(view.topRated.map((p) => p.id)).toEqual(['1', '3']);
      expect(view.others.map((p) => p.id)).toEqual(['4', '2']);
    });

    it('never mixes in products from other categories', async () => {
      const view = await service().getCategory('jewelery');
      const all = [...view.topRated, ...view.others];
      expect(all.every((p) => p.category.slug === 'jewelery')).toBe(true);
    });

    it('throws NotFoundError for an unknown category', async () => {
      await expect(service().getCategory('nope')).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('search', () => {
    it('matches title text case-insensitively', async () => {
      const results = await service().search('ssd');
      expect(results.map((p) => p.id)).toEqual(['1']);
    });

    it('matches description text', async () => {
      const results = await service().search('curved');
      expect(results.map((p) => p.id)).toEqual(['2']);
    });

    it('requires every word to match (AND, not OR)', async () => {
      expect((await service().search('gold ring')).map((p) => p.id)).toEqual(['5']);
      expect(await service().search('gold monitor')).toEqual([]);
    });

    it('returns nothing for a blank query', async () => {
      expect(await service().search('   ')).toEqual([]);
    });
  });

  describe('getProduct', () => {
    it('throws NotFoundError for an unknown id', async () => {
      await expect(service().getProduct('999')).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
