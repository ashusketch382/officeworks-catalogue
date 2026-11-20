import { useState, type FormEvent } from 'react';
import { Link, NavLink, Outlet, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAsync } from '../api/useAsync';

function SearchBar() {
  const [params] = useSearchParams();
  const [term, setTerm] = useState(params.get('q') ?? '');
  const navigate = useNavigate();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const q = term.trim();
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <form role="search" className="search" onSubmit={onSubmit}>
      <label htmlFor="search-input" className="visually-hidden">
        Search products
      </label>
      <input
        id="search-input"
        type="search"
        placeholder="Search products"
        value={term}
        maxLength={100}
        onChange={(e) => setTerm(e.target.value)}
      />
      <button type="submit">Search</button>
    </form>
  );
}

function CategoryNav() {
  const state = useAsync(() => api.getCategories(), []);
  if (state.status !== 'success') return null;
  return (
    <nav aria-label="Categories" className="categories">
      {state.data.map((c) => (
        <NavLink key={c.slug} to={`/categories/${c.slug}`}>
          {c.name}
        </NavLink>
      ))}
    </nav>
  );
}

export function Layout() {
  return (
    <>
      <header className="header">
        <div className="header-inner">
          <Link to="/" className="brand">
            Catalogue
          </Link>
          <SearchBar />
        </div>
        <CategoryNav />
      </header>
      <main className="main">
        <Outlet />
      </main>
    </>
  );
}
