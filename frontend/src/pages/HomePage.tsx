import { useFeatured } from '../api/queries';
import { ProductGrid } from '../components/ProductTile';
import { Status } from '../components/Status';

export function HomePage() {
  const query = useFeatured();
  return (
    <section>
      <h1>Top rated</h1>
      <Status query={query}>{(products) => <ProductGrid products={products} />}</Status>
    </section>
  );
}
