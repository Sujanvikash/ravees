import { useState } from 'react';

/**
 * Splits a list into pages of `size` rows. `resetKey` is whatever the list depends on (filters, search, tab):
 * when it changes the list starts again at page 1. Returns the rows of the current page and the pager's state
 * for <Pager>.
 */
export const usePages = (rows, size = 50, resetKey = '') => {
  const [state, setState] = useState({ key: resetKey, page: 0 });
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const page = state.key === resetKey ? Math.min(state.page, pages - 1) : 0;
  return {
    rows: rows.slice(page * size, page * size + size),
    pager: { page, pages, size, total: rows.length, setPage: (p) => setState({ key: resetKey, page: p }) },
  };
};
