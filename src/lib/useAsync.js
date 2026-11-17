import { useCallback, useEffect, useState } from 'react';

// Loads data from the API and exposes a reload function.
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const load = useCallback(async () => {
    try {
      const data = await fn();
      setState({ data, error: null, loading: false });
    } catch (e) {
      setState((s) => ({ ...s, error: e.message, loading: false }));
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    load();
  }, [load]);
  const setData = (data) => setState((s) => ({ ...s, data: typeof data === 'function' ? data(s.data) : data }));
  return { ...state, reload: load, setData };
}
