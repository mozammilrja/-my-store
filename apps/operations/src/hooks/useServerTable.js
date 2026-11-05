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

/**
 * useTableSort
 * Orders a list the module already holds, for a table whose columns are
 * sortable. `accessors` says what a column's value is, so a column that prints
 * a formatted amount still sorts on the number behind it. Define it outside
 * the component, or memoise it: it is a dependency of the sorted result.
 *
 * A first click on a column takes the direction that reads as "most
 * interesting first" — largest for numbers, A to Z for text. Clicking the same
 * column again reverses it.
 */
export function useTableSort(rows, accessors = {}, initial = {}) {
  const [sort, setSort] = useState({
    key: initial.key ?? null,
    direction: initial.direction ?? "desc",
  });

  const onSort = useCallback(
    (key) => {
      setSort((prev) => {
        if (prev.key === key) {
          return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
        }
        const read = accessors[key];
        const sample = Array.isArray(rows) ? rows.find((row) => read?.(row) !== undefined) : undefined;
        const value = sample === undefined ? 0 : read?.(sample);
        return { key, direction: typeof value === "string" ? "asc" : "desc" };
      });
    },
    [rows, accessors]
  );

  const sorted = useMemo(() => {
    const list = Array.isArray(rows) ? rows : [];
    const read = accessors[sort.key];
    if (!sort.key || !read) return list;
    const sign = sort.direction === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      const av = read(a);
      const bv = read(b);
      // A row with nothing recorded sorts last in either direction, rather
      // than being treated as a zero that beats a real figure.
      if (av === null || av === undefined) return bv === null || bv === undefined ? 0 : 1;
      if (bv === null || bv === undefined) return -1;
      if (typeof av === "string" || typeof bv === "string") {
        return String(av).localeCompare(String(bv), undefined, { sensitivity: "base" }) * sign;
      }
      return (av - bv) * sign;
    });
  }, [rows, accessors, sort]);

  return { rows: sorted, sortKey: sort.key, sortDirection: sort.direction, onSort };
}
