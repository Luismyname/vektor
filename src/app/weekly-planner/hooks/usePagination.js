import { useMemo, useState, useCallback } from 'react'

const ITEMS_PER_PAGE = 3

export function usePagination(items) {
  const [page, setPage] = useState(1)

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE)),
    [items.length]
  )

  const currentPage = useMemo(
    () => Math.min(page, Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE))),
    [page, items.length]
  )

  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return items.slice(start, start + ITEMS_PER_PAGE)
  }, [items, currentPage])

  const goPrev = useCallback(() => setPage(p => Math.max(1, p - 1)), [])
  const goNext = useCallback(() => setPage(p => Math.min(Math.ceil(items.length / ITEMS_PER_PAGE), p + 1)), [items.length])

  return {
    currentPage,
    totalPages,
    currentItems,
    hasPrev: currentPage > 1,
    hasNext: currentPage < totalPages,
    goPrev,
    goNext,
  }
}