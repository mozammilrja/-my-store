import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_PAGE_SIZE } from '../components/shared/DataTable';

/**
 * useServerTable
 * One place for the paging and filter state a list screen needs, so every
 * module asks the API the same way: a debounced search term, a bag of filter
 * values, and a page that resets whenever the result set changes shape.
 *
 * `params` is ready to hand straight to a query hook; entries whose value is
 * the filter's "all" sentinel are dropped so the API sees only real filters.
 */
export function useServerTable({
  filters: initialFilters = {},
  pageSize: initialPageSize = DEFAULT_PAGE_SIZE,
  allValue = 'all',
  searchDelay = 300,
} = {}) {
  const [page, setPage] = useState(1);
  const [limit, setLimitState] = useState(initialPageSize);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState(initialFilters);
  const initialRef = useRef(initialFilters);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), searchDelay);
    return () => clearTimeout(id);
  }, [search, searchDelay]);

  // A narrower result set invalidates the current page number.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters, limit]);

  const setFilter = useCallback((key, value) => {
    setFilters((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }));
  }, []);

  const setLimit = useCallback((value) => {
    setLimitState(Number(value) || DEFAULT_PAGE_SIZE);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialRef.current);
    setSearch('');
  }, []);

  const activeFilterCount = useMemo(
    () =>
      Object.entries(filters).filter(([key, value]) => value !== allValue && value !== initialRef.current[key])
        .length + (search.trim() ? 1 : 0),
    [filters, search, allValue]
  );

  const params = useMemo(() => {
    const out = { page, limit };
    if (debouncedSearch) out.q = debouncedSearch;
    for (const [key, value] of Object.entries(filters)) {
      if (value === undefined || value === null || value === '' || value === allValue) continue;
      out[key] = value;
    }
    return out;
  }, [page, limit, debouncedSearch, filters, allValue]);

  return {
    page,
    setPage,
    limit,
    setLimit,
    search,
    setSearch,
    debouncedSearch,
    filters,
    setFilter,
    resetFilters,
    activeFilterCount,
    params,
  };
}

/**
 * useClientTable
 * Pages a list the module already holds in memory. The count it reports is the
 * length of that list, never a headline number typed into the markup.
 */
export function useClientTable(rows, { pageSize: initialPageSize = DEFAULT_PAGE_SIZE } = {}) {
  const [page, setPage] = useState(1);
  const [limit, setLimitState] = useState(initialPageSize);
  const total = Array.isArray(rows) ? rows.length : 0;

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const current = Math.min(page, totalPages);

  useEffect(() => {
    setPage(1);
  }, [total, limit]);

  const pageRows = useMemo(
    () => (Array.isArray(rows) ? rows.slice((current - 1) * limit, current * limit) : []),
    [rows, current, limit]
  );

  const setLimit = useCallback((value) => setLimitState(Number(value) || DEFAULT_PAGE_SIZE), []);

  return { page: current, setPage, limit, setLimit, total, pageRows };
}
