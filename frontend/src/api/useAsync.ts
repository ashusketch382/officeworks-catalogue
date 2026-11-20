import { useEffect, useState } from 'react';

export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | { status: 'success'; data: T };

/**
 * Minimal data-fetching hook. Ignores responses that arrive after the inputs
 * changed (e.g. navigating between categories quickly). If caching or retries
 * are needed later, swap this for TanStack Query without touching pages much.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    fn().then(
      (data) => active && setState({ status: 'success', data }),
      (error: Error) => active && setState({ status: 'error', error }),
    );
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
