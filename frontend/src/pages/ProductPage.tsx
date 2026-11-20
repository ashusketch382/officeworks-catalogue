import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAsync } from '../api/useAsync';
import { EnquiryForm } from '../components/EnquiryForm';
import { formatPrice } from '../components/format';
import { Status } from '../components/Status';

export function ProductPage() {
  const { id = '' } = useParams();
  const state = useAsync(() => api.getProduct(id), [id]);
  const [enquiring, setEnquiring] = useState(false);

  return (
    <Status state={state}>
      {(product) => (
        <article className="product">
          <img src={product.imageUrl} alt={product.title} />
          <div>
            <Link to={`/categories/${product.category.slug}`} className="muted">
              {product.category.name}
            </Link>
            <h1>{product.title}</h1>
            <p className="price large">{formatPrice(product.price)}</p>
            <p className="muted">
              ★ {product.rating.average.toFixed(1)} ({product.rating.count} reviews)
            </p>
            <p>{product.description}</p>

            {enquiring ? (
              <EnquiryForm productId={product.id} productTitle={product.title} onCancel={() => setEnquiring(false)} />
            ) : (
              <button type="button" onClick={() => setEnquiring(true)}>
                Enquire
              </button>
            )}
          </div>
        </article>
      )}
    </Status>
  );
}
