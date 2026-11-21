import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';

/** Renders loading / error states consistently; children render on success. */
export function Status<T>({ query, children }: { query: UseQueryResult<T>; children: (data: T) => ReactNode }) {
  if (query.isError) {
    return (
      <p className="error" role="alert">
        {query.error.message}
      </p>
    );
  }
  if (query.isPending) {
    return (
      <p className="muted" role="status">
        Loading…
      </p>
    );
  }
  return <>{children(query.data)}</>;
}
