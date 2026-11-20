import type { ReactNode } from 'react';
import type { AsyncState } from '../api/useAsync';

/** Renders loading / error states consistently; children render on success. */
export function Status<T>({ state, children }: { state: AsyncState<T>; children: (data: T) => ReactNode }) {
  if (state.status === 'loading') {
    return (
      <p className="muted" role="status">
        Loading…
      </p>
    );
  }
  if (state.status === 'error') {
    return (
      <p className="error" role="alert">
        {state.error.message}
      </p>
    );
  }
  return <>{children(state.data)}</>;
}
