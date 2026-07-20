import { useState } from 'react';

/** Small reusable pagination state helper shared across dashboard tables/lists. */
export const usePagination = (initialPage = 1, initialLimit = 12) => {
  const [page, setPage] = useState(initialPage);
  const [limit] = useState(initialLimit);

  const nextPage = (totalPages) => setPage((p) => Math.min(p + 1, totalPages || p + 1));
  const prevPage = () => setPage((p) => Math.max(1, p - 1));
  const goToPage = (p) => setPage(p);

  return { page, limit, nextPage, prevPage, goToPage, setPage };
};
