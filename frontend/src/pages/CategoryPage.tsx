import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAsync } from '../api/useAsync';
import { ProductGrid } from '../components/ProductTile';
import { Status } from '../components/Status';

export function CategoryPage() {
  const { slug = '' } = useParams();
  const state = useAsync(() => api.getCategory(slug), [slug]);

  return (
    <Status state={state}>
      {(view) => (
        <>
          <h1>{view.category.name}</h1>
          <section>
            <h2>Top rated in {view.category.name}</h2>
            <ProductGrid products={view.topRated} />
          </section>
          <section>
            <h2>More in {view.category.name}</h2>
            <ProductGrid products={view.others} emptyText="No other products in this category." />
          </section>
        </>
      )}
    </Status>
  );
}
