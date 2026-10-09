import { useState, useMemo } from 'react'

// Hook para paginación cognitiva (3 elementos por página)
export function useCognitivePagination(items, itemsPerPage = 3) {
  const [currentPage, setCurrentPage] = useState(1)

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(items.length / itemsPerPage)),
    [items.length, itemsPerPage]
  )

  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return items.slice(start, start + itemsPerPage)
  }, [items, currentPage, itemsPerPage])

  const goNext = () => setCurrentPage(p => Math.min(p + 1, totalPages))
  const goPrev = () => setCurrentPage(p => Math.max(p - 1, 1))
  const goToPage = (page) => setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  const reset = () => setCurrentPage(1)

  return {
    currentPage,
    totalPages,
    currentItems,
    goNext,
    goPrev,
    goToPage,
    reset,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1,
    itemsPerPage
  }
}