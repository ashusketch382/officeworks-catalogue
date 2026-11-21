import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/App';
import { api } from '../src/api/client';
import { createQueryClient } from '../src/api/queries';
import { makeProduct } from './fixtures';

vi.mock('../src/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/api/client')>();
  return {
    ...actual,
    api: {
      getFeatured: vi.fn(),
      getCategories: vi.fn(),
      getCategory: vi.fn(),
      search: vi.fn(),
      getProduct: vi.fn(),
      submitEnquiry: vi.fn(),
    },
  };
});

const mocked = vi.mocked(api);
const featured = ['1', '2', '3', '4', '5'].map((id) => makeProduct(id, `Featured ${id}`));
const electronics = { slug: 'electronics', name: 'Electronics' };

/**
 * Renders like production (same QueryClient config) but inside <StrictMode>,
 * which double-mounts components exactly as `npm run dev` does. Retries are
 * off so error tests don't wait for the retry delay.
 */
function renderAt(path: string) {
  const client = createQueryClient();
  client.setDefaultOptions({ queries: { ...client.getDefaultOptions().queries, retry: false } });
  return render(
    <StrictMode>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <App />
        </MemoryRouter>
      </QueryClientProvider>
    </StrictMode>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  mocked.getCategories.mockResolvedValue([electronics]);
});

describe('pages', () => {
  it('home page shows the 5 featured products', async () => {
    mocked.getFeatured.mockResolvedValue(featured);
    renderAt('/');
    const grid = await screen.findByRole('list');
    expect(within(grid).getAllByRole('link')).toHaveLength(5);
  });

  it('category page shows top rated and additional products', async () => {
    mocked.getCategory.mockResolvedValue({
      category: electronics,
      topRated: [makeProduct('11', 'Fast SSD')],
      others: [makeProduct('13', 'Monitor')],
    });
    renderAt('/categories/electronics');
    expect(await screen.findByRole('heading', { name: 'Top rated in Electronics' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Fast SSD' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'More in Electronics' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Monitor' })).toBeInTheDocument();
  });

  it('search runs when the search button is clicked and shows results', async () => {
    mocked.getFeatured.mockResolvedValue([]);
    mocked.search.mockResolvedValue([makeProduct('3', 'Mens Cotton Jacket')]);
    const user = userEvent.setup();
    renderAt('/');

    await user.type(screen.getByRole('searchbox', { name: /search products/i }), 'jacket');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    expect(await screen.findByRole('link', { name: 'Mens Cotton Jacket' })).toBeInTheDocument();
    expect(mocked.search).toHaveBeenCalledWith('jacket');
  });

  it('clicking a product tile opens the product page with an Enquire button', async () => {
    mocked.getFeatured.mockResolvedValue([makeProduct('3', 'Mens Cotton Jacket')]);
    const user = userEvent.setup();
    renderAt('/');

    await user.click(await screen.findByRole('link', { name: 'Mens Cotton Jacket' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Mens Cotton Jacket' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enquire' })).toBeInTheDocument();
  });

  it('a product page opened directly by URL fetches that product', async () => {
    mocked.getProduct.mockResolvedValue(makeProduct('7', 'White Gold Ring'));
    renderAt('/products/7');

    expect(await screen.findByRole('heading', { level: 1, name: 'White Gold Ring' })).toBeInTheDocument();
    expect(mocked.getProduct).toHaveBeenCalledTimes(1);
    expect(mocked.getProduct).toHaveBeenCalledWith('7');
  });

  it('shows a friendly error when the API fails', async () => {
    mocked.getFeatured.mockRejectedValue(new Error('Products are temporarily unavailable.'));
    renderAt('/');
    expect(await screen.findByRole('alert')).toHaveTextContent('Products are temporarily unavailable.');
  });
});

describe('API calls are never duplicated', () => {
  it('initial load makes each call once, even with StrictMode double-mounting', async () => {
    mocked.getFeatured.mockResolvedValue(featured);
    renderAt('/');
    await screen.findByRole('link', { name: 'Featured 1' });

    expect(mocked.getFeatured).toHaveBeenCalledTimes(1);
    expect(mocked.getCategories).toHaveBeenCalledTimes(1);
  });

  it('a full browsing journey calls each endpoint once and reuses cached data', async () => {
    const jacket = makeProduct('3', 'Mens Cotton Jacket');
    const ssd = { ...makeProduct('11', 'Fast SSD'), category: electronics };
    mocked.getFeatured.mockResolvedValue([jacket]);
    mocked.getCategory.mockResolvedValue({ category: electronics, topRated: [ssd], others: [] });
    mocked.search.mockResolvedValue([jacket]);
    const user = userEvent.setup();
    renderAt('/');

    // Home -> category (nav link)
    await user.click(await screen.findByRole('link', { name: 'Electronics' }));
    // Category -> product tile (product data already loaded with the category)
    await user.click(await screen.findByRole('link', { name: 'Fast SSD' }));
    await screen.findByRole('heading', { level: 1, name: 'Fast SSD' });
    // Product -> back to its category (link on the product page)
    await user.click(within(screen.getByRole('article')).getByRole('link', { name: 'Electronics' }));
    await screen.findByRole('heading', { name: 'Top rated in Electronics' });
    // -> Home again (brand link)
    await user.click(screen.getByRole('link', { name: 'Catalogue' }));
    await screen.findByRole('link', { name: 'Mens Cotton Jacket' });
    // Search, then open a result
    await user.type(screen.getByRole('searchbox', { name: /search products/i }), 'jacket');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    await user.click(await screen.findByRole('link', { name: 'Mens Cotton Jacket' }));
    await screen.findByRole('heading', { level: 1, name: 'Mens Cotton Jacket' });

    expect(mocked.getCategories).toHaveBeenCalledTimes(1);
    expect(mocked.getFeatured).toHaveBeenCalledTimes(1); // home visited twice
    expect(mocked.getCategory).toHaveBeenCalledTimes(1); // category visited twice
    expect(mocked.search).toHaveBeenCalledTimes(1);
    expect(mocked.getProduct).not.toHaveBeenCalled(); // products come from list data
  });
});
