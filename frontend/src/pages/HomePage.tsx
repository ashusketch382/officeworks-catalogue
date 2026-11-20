import { api } from '../api/client';
import { useAsync } from '../api/useAsync';
import { ProductGrid } from '../components/ProductTile';
import { Status } from '../components/Status';

export function HomePage() {
  const state = useAsync(() => api.getFeatured(), []);
  return (
    <section>
      <h1>Top rated</h1>
      <Status state={state}>{(products) => <ProductGrid products={products} />}</Status>
    </section>
  );
}
