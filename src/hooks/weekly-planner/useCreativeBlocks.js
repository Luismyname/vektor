import { useMemo, useState, useEffect, useCallback, useRef } from 'react'
import {
  createCreativeBlock,
  updateCreativeBlock,
  getWeeklyCreativeBlocks,
  getDailyCreativeBlocks,
  deleteCreativeBlock,
  getCreativeBlocksStats,
} from '../../services/creative'

/**
 * Hook para gestionar bloques creativos (deep work)
 */
export function useCreativeBlocks(userId, weekStart) {
  const [weeklyBlocks, setWeeklyBlocks] = useState([])
  const [dailyBlocks, setDailyBlocks] = useState({})
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const isInitialLoad = useRef(true)

  // Cargar bloques de la semana
  const loadWeeklyBlocks = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const { data, error } = await getWeeklyCreativeBlocks(userId, weekStart)
      if (error) throw error
      setWeeklyBlocks(data || [])

      // Agrupar por dia
      const byDay = {}
      ;(data || []).forEach(block => {
        if (!byDay[block.date]) byDay[block.date] = []
        byDay[block.date].push(block)
      })
      setDailyBlocks(byDay)

      // Cargar stats
      const { stats: statsData, error: statsError } = await getCreativeBlocksStats(userId, weekStart)
      if (statsError) throw statsError
      setStats(statsData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [userId, weekStart])

  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false
      loadWeeklyBlocks()
    }
  }, [loadWeeklyBlocks])

  // Cargar bloques de un dia especifico
  const loadDailyBlocks = useCallback(async (date) => {
    if (!userId) return
    try {
      const { data, error } = await getDailyCreativeBlocks(userId, date)
      if (error) throw error
      setDailyBlocks(prev => ({ ...prev, [date]: data || [] }))
      return data || []
    } catch (err) {
      setError(err.message)
      return []
    }
  }, [userId])

  // Crear bloque creativo
  const createBlock = useCallback(async (input) => {
    if (!userId) return { error: new Error('No user') }

    const { data, error } = await createCreativeBlock(userId, {
      ...input,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      blockType: input.blockType,
      plannedTaskId: input.plannedTaskId,
      actualFocusSessionId: input.actualFocusSessionId,
      qualityScore: input.qualityScore,
      interruptions: input.interruptions,
      notes: input.notes,
    })

    if (!error && data) {
      // Actualizar estado local
      setWeeklyBlocks(prev => [...prev, data])
      setDailyBlocks(prev => ({
        ...prev,
        [data.date]: [...(prev[data.date] || []), data],
      }))
    }
    return { data, error }
  }, [userId])

  // Actualizar bloque
  const updateBlock = useCallback(async (id, updates) => {
    const { data, error } = await updateCreativeBlock(id, updates)
    if (!error && data) {
      setWeeklyBlocks(prev => prev.map(b => b.id === id ? data : b))
      setDailyBlocks(prev => {
        const dateBlocks = prev[data.date] || []
        const updated = dateBlocks.map(b => b.id === id ? data : b)
        return { ...prev, [data.date]: updated }
      })
    }
    return { data, error }
  }, [])

  // Actualizar calidad del bloque
  const updateQuality = useCallback(async (id, qualityScore, interruptions) => {
    return updateBlock(id, {
      quality_score: qualityScore,
      interruptions,
    })
  }, [updateBlock])

  // Eliminar bloque
  const deleteBlock = useCallback(async (id, date) => {
    const { error } = await deleteCreativeBlock(id)
    if (!error) {
      setWeeklyBlocks(prev => prev.filter(b => b.id !== id))
      setDailyBlocks(prev => ({
        ...prev,
        [date]: (prev[date] || []).filter(b => b.id !== id),
      }))
    }
    return { error }
  }, [])

  // Obtener bloques de un dia
  const getBlocksForDate = useCallback((date) => {
    return dailyBlocks[date] || []
  }, [dailyBlocks])

  // Obtener bloques de la semana
  const getWeeklyBlocks = useCallback(() => {
    return weeklyBlocks
  }, [weeklyBlocks])

  // Formatear duracion en minutos a string legible
  const formatDuration = useCallback((minutes) => {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    if (h === 0) return `${m} min`
    if (m === 0) return `${h}h`
    return `${h}h ${m}min`
  }, [])

  // Calcular duracion en minutos de un bloque
  const getBlockDuration = useCallback((block) => {
    const start = new Date(`2000-01-01T${block.start_time}`)
    const end = new Date(`2000-01-01T${block.end_time}`)
    return Math.round((end - start) / (1000 * 60))
  }, [])

  // Calcular calidad promedio de la semana
  const avgQuality = useMemo(() => {
    const withQuality = weeklyBlocks.filter(b => b.quality_score !== null)
    if (!withQuality.length) return null
    return Math.round(withQuality.reduce((s, b) => s + b.quality_score, 0) / withQuality.length)
  }, [weeklyBlocks])

  return {
    // Estado
    weeklyBlocks,
    dailyBlocks,
    stats,
    loading,
    error,

    // Acciones
    createBlock,
    updateBlock,
    updateQuality,
    deleteBlock,
    loadWeeklyBlocks,
    loadDailyBlocks,

    // Consultas
    getBlocksForDate,
    getWeeklyBlocks,
    formatDuration,
    getBlockDuration,
    avgQuality,
  }
}