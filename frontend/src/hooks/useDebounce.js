import { useEffect, useState } from 'react';

/**
 * Debounces a fast-changing value (e.g. a search input) so dependent
 * effects (API calls) only fire after the user pauses typing.
 */
export const useDebounce = (value, delay = 400) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
};
