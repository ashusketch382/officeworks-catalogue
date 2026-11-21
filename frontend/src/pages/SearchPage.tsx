import { useSearchParams } from 'react-router-dom';
import { useSearch } from '../api/queries';
import { ProductGrid } from '../components/ProductTile';
import { Status } from '../components/Status';

export function SearchPage() {
  const [params] = useSearchParams();
  const q = (params.get('q') ?? '').trim();
  const query = useSearch(q);

  if (!q) return <p className="muted">Enter a search term to find products.</p>;

  return (
    <section>
      <h1>Results for “{q}”</h1>
      <Status query={query}>
        {(products) => <ProductGrid products={products} emptyText={`No products match “${q}”.`} />}
      </Status>
    </section>
  );
}
