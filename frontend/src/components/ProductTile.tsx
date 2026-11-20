import { Link } from 'react-router-dom';
import type { Product } from '../api/types';
import { formatPrice } from './format';

export function ProductTile({ product }: { product: Product }) {
  return (
    <Link to={`/products/${product.id}`} className="tile" aria-label={product.title}>
      <img src={product.imageUrl} alt="" loading="lazy" />
      <span className="tile-title">{product.title}</span>
      <span className="tile-meta">
        <span className="price">{formatPrice(product.price)}</span>
        <span className="rating" aria-label={`Rated ${product.rating.average} out of 5`}>
          ★ {product.rating.average.toFixed(1)}
        </span>
      </span>
    </Link>
  );
}

export function ProductGrid({ products, emptyText = 'No products found.' }: { products: Product[]; emptyText?: string }) {
  if (products.length === 0) return <p className="muted">{emptyText}</p>;
  return (
    <ul className="grid">
      {products.map((p) => (
        <li key={p.id}>
          <ProductTile product={p} />
        </li>
      ))}
    </ul>
  );
}
