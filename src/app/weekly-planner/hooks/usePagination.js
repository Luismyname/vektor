import { useMemo, useState, useCallback } from 'react'

/**
 * Calcula el nivel de fricción cognitiva basado en la carga cognitiva y prioridad
 */
export function calculateCognitiveFriction(item) {
  const load = String(item.cognitive_load || item.cognitiveLoad || item.priority || 'medium').toUpperCase()
  const loadScore = { LOW: 1, MEDIUM: 2, HIGH: 3 }[load] || 2
  const priorityScore = { HIGH: 3, MEDIUM: 2, LOW: 1 }[String(item.priority || 'medium').toUpperCase()] || 2
  // Combinamos carga cognitiva y prioridad (peso 60% carga, 40% prioridad)
  return Math.round(loadScore * 0.6 + priorityScore * 0.4)
}

/**
 * Hook de paginación adaptativa basado en carga cognitiva
 * - Carga baja: más items por página (4)
 * - Carga media: items base (3)
 * - Carga alta: menos items por página (2)
 */
export function usePagination(items, options = {}) {
  const { 
    baseItemsPerPage = 3,
    minItemsPerPage = 2,
    maxItemsPerPage = 4,
    adaptive = true 
  } = options

  const [page, setPage] = useState(1)

  // Calcular fricción promedio de los items actuales
  const avgFriction = useMemo(() => {
    if (!items.length || !adaptive) return 2 // neutral
    const totalFriction = items.reduce((sum, item) => sum + calculateCognitiveFriction(item), 0)
    return Math.round(totalFriction / items.length)
  }, [items, adaptive])

  // Determinar items por página basado en fricción promedio
  const itemsPerPage = useMemo(() => {
    if (!adaptive) return baseItemsPerPage
    if (avgFriction >= 3) return minItemsPerPage // Alta fricción -> menos items
    if (avgFriction <= 1) return maxItemsPerPage // Baja fricción -> más items
    return baseItemsPerPage // Media -> base
  }, [avgFriction, adaptive, baseItemsPerPage, minItemsPerPage, maxItemsPerPage])

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(items.length / itemsPerPage)),
    [items.length, itemsPerPage]
  )

  const currentPage = useMemo(
    () => Math.min(page, Math.max(1, Math.ceil(items.length / itemsPerPage))),
    [page, items.length, itemsPerPage]
  )

  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return items.slice(start, start + itemsPerPage)
  }, [items, currentPage, itemsPerPage])

  const goPrev = useCallback(() => setPage(p => Math.max(1, p - 1)), [])
  const goNext = useCallback(() => setPage(p => Math.min(Math.ceil(items.length / itemsPerPage), p + 1)), [items.length, itemsPerPage])

  // Resetear a página 1 si cambian los items o itemsPerPage
  const resetPage = useCallback(() => setPage(1), [])

  return {
    currentPage,
    totalPages,
    currentItems,
    itemsPerPage,
    avgFriction,
    hasPrev: currentPage > 1,
    hasNext: currentPage < totalPages,
    goPrev,
    goNext,
    resetPage,
  }
}

// Re-exportar la función de cálculo para uso externo
export { calculateCognitiveFriction as getItemFriction }