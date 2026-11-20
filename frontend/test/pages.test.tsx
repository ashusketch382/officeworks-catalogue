import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/App';
import { api } from '../src/api/client';
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

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  mocked.getCategories.mockResolvedValue([{ slug: 'electronics', name: 'Electronics' }]);
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
      category: { slug: 'electronics', name: 'Electronics' },
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

    expect(mocked.search).toHaveBeenCalledWith('jacket');
    expect(await screen.findByRole('link', { name: 'Mens Cotton Jacket' })).toBeInTheDocument();
  });

  it('clicking a product tile opens the product page with an Enquire button', async () => {
    const product = makeProduct('3', 'Mens Cotton Jacket');
    mocked.getFeatured.mockResolvedValue([product]);
    mocked.getProduct.mockResolvedValue(product);
    const user = userEvent.setup();
    renderAt('/');

    await user.click(await screen.findByRole('link', { name: 'Mens Cotton Jacket' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Mens Cotton Jacket' })).toBeInTheDocument();
    expect(mocked.getProduct).toHaveBeenCalledWith('3');
    expect(screen.getByRole('button', { name: 'Enquire' })).toBeInTheDocument();
  });

  it('shows a friendly error when the API fails', async () => {
    mocked.getFeatured.mockRejectedValue(new Error('Products are temporarily unavailable.'));
    renderAt('/');
    expect(await screen.findByRole('alert')).toHaveTextContent('Products are temporarily unavailable.');
  });
});
