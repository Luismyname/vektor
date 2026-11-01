import { useMemo, useState, useEffect, useCallback } from 'react'
import { getWeeklyEnergyLevels, detectChronotype, getUserPeakHours } from '../../services/energy'
import { getWeeklyCreativeBlocks, getCreativeBlocksStats } from '../../services/creative'
import { getWeeklyProgress, getHabitConsistency, getWeekDates } from '../../services/weekly-planner'
import type { Habit } from '../../types'

interface EnergyDatum {
  date: string
  hour: number
  energy_level: number
  source: string
}

interface CreativeBlock {
  date: string
  start_time: string
  end_time: string
  block_type: string
  quality_score: number | null
}

interface CreativeStats {
  totalBlocks: number
  totalMinutes: number
  avgQuality: number | null
  totalInterruptions: number
  byType: Record<string, number>
  withQualityScore: number
}

interface WeeklyProgress {
  scheduled: number
  completed: number
  failed: number
  moved: number
  focusSessions: number
  completionRate: number
}

type HabitConsistency = Habit & {
  scheduled: number
  completed: number
  failed: number
}

interface EnergyQualityCorrelation {
  correlation: number
  sampleSize: number
  interpretation: 'positive' | 'negative' | 'neutral'
}

interface WeeklyInsight {
  type: string
  title: string
  description: string
  actionable: string
}

/**
 * Hook combinado para analíticas semanales: energía + bloques creativos + tareas + hábitos
 * Calcula correlaciones y patrones automáticamente
 */
export function useWeeklyAnalytics(userId: string, weekStart: string) {
  const [energyData, setEnergyData] = useState<EnergyDatum[]>([])
  const [creativeBlocks, setCreativeBlocks] = useState<CreativeBlock[]>([])
  const [creativeStats, setCreativeStats] = useState<CreativeStats | null>(null)
  const [progress, setProgress] = useState<WeeklyProgress | null>(null)
  const [habitConsistency, setHabitConsistency] = useState<HabitConsistency[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadAll = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError(null)

    try {
      const [
        { data: energy, error: energyError },
        { data: blocks, error: blocksError },
        { stats: statsData, error: statsError },
        { progress: progressData, error: progressError },
        { consistency, error: habitError }
      ] = await Promise.all([
        getWeeklyEnergyLevels(userId, weekStart),
        getWeeklyCreativeBlocks(userId, weekStart),
        getCreativeBlocksStats(userId, weekStart),
        getWeeklyProgress(userId, weekStart),
        getHabitConsistency(userId, weekStart)
      ])

      if (energyError) throw energyError
      if (blocksError) throw blocksError
      if (statsError) throw statsError
      if (progressError) throw progressError
      if (habitError) throw habitError

      setEnergyData(energy || [])
      setCreativeBlocks(blocks || [])
      setCreativeStats(statsData)
      setProgress(progressData)
      setHabitConsistency(consistency || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [userId, weekStart])

  useEffect(() => {
    const timer = setTimeout(loadAll, 0)
    return () => clearTimeout(timer)
  }, [loadAll])

  // Energy heatmap data: array of { date, hour, energy_level }
  const energyHeatmap = useMemo(() => {
    const heatmap: Array<{ date: string; hour: number; energy: number; source: string }> = []
    energyData.forEach(entry => {
      heatmap.push({
        date: entry.date,
        hour: entry.hour,
        energy: entry.energy_level,
        source: entry.source
      })
    })
    return heatmap
  }, [energyData])

  // Energy by day and hour (for grid visualization)
  const energyByDayHour = useMemo(() => {
    const grid: Record<string, Record<number, number | null>> = {}
    const dates = getWeekDates(weekStart)
    dates.forEach(date => {
      grid[date] = {}
      for (let h = 0; h <= 23; h++) {
        const entry = energyData.find(e => e.date === date && e.hour === h)
        grid[date][h] = entry ? entry.energy_level : null
      }
    })
    return grid
  }, [energyData, weekStart])

  // Average energy by hour across the week
  const avgEnergyByHour = useMemo(() => {
    const byHour: Record<number, number> = {}
    for (let h = 0; h <= 23; h++) {
      const values = energyData.filter(e => e.hour === h).map(e => e.energy_level)
      if (values.length) {
        byHour[h] = Math.round(values.reduce((a, b) => a + b, 0) / values.length)
      }
    }
    return byHour
  }, [energyData])

  // Peak hours detected from actual data
  const detectedPeakHours = useMemo(() => {
    const chronotype = detectChronotype(energyData)
    return getUserPeakHours(chronotype, {})
  }, [energyData])

  // Creative blocks by day
  const creativeBlocksByDay = useMemo(() => {
    const byDay: Record<string, CreativeBlock[]> = {}
    creativeBlocks.forEach(block => {
      if (!byDay[block.date]) byDay[block.date] = []
      byDay[block.date].push(block)
    })
    return byDay
  }, [creativeBlocks])

  // Creative blocks with energy correlation
  const blocksWithEnergy = useMemo(() => {
    return creativeBlocks.map(block => {
      const blockHour = parseInt(block.start_time.split(':')[0])
      const blockDate = block.date
      const energyEntry = energyData.find(e => e.date === blockDate && e.hour === blockHour)
      return {
        ...block,
        energyAtStart: energyEntry?.energy_level || null,
        duration: getBlockDuration(block)
      }
    })
  }, [creativeBlocks, energyData])

  // Correlation: energy at block start vs quality score
  const energyQualityCorrelation = useMemo<EnergyQualityCorrelation | null>(() => {
    const withBoth = blocksWithEnergy.filter(b => b.energyAtStart !== null && b.quality_score !== null)
    if (withBoth.length < 3) return null

    const correlation = calculateCorrelation(
      withBoth.map(b => b.energyAtStart),
      withBoth.map(b => b.quality_score)
    )
    return {
      correlation,
      sampleSize: withBoth.length,
      interpretation: correlation > 0.3 ? 'positive' : correlation < -0.3 ? 'negative' : 'neutral'
    }
  }, [blocksWithEnergy])

  // Best days for deep work (high energy + high quality)
  const bestDeepWorkDays = useMemo(() => {
    const dayScores: Record<string, number[]> = {}
    creativeBlocks.forEach(block => {
      const blockHour = parseInt(block.start_time.split(':')[0])
      const energyEntry = energyData.find(e => e.date === block.date && e.hour === blockHour)
      const energy = energyEntry?.energy_level || 5
      const quality = block.quality_score || 5
      const score = (energy + quality) / 2

      if (!dayScores[block.date]) dayScores[block.date] = []
      dayScores[block.date].push(score)
    })

    return Object.entries(dayScores)
      .map(([date, scores]) => ({
        date,
        avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10,
        sessions: scores.length
      }))
      .sort((a, b) => b.avgScore - a.avgScore)
  }, [creativeBlocks, energyData])

  // Weekly pattern insights
  const insights = useMemo<WeeklyInsight[]>(() => {
    const insights = []

    // Energy pattern
    const avgEnergyByHour = Object.entries(
      energyData.reduce((acc, e) => {
        if (!acc[e.hour]) acc[e.hour] = []
        acc[e.hour].push(e.energy_level)
        return acc
      }, {} as Record<number, number[]>)
    ).map(([hour, vals]) => ({
      hour: parseInt(hour),
      avg: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
    }))

    if (avgEnergyByHour.length) {
      const peakHour = avgEnergyByHour.reduce((max, h) => h.avg > max.avg ? h : max)
      const lowHour = avgEnergyByHour.reduce((min, h) => h.avg < min.avg ? h : min)
      
      insights.push({
        type: 'energy_peak',
        title: 'Tu hora de máxima energía',
        description: `A las ${peakHour.hour}:00 promedias ${peakHour.avg}/10 de energía`,
        actionable: `Agenda deep work a las ${peakHour.hour}:00`
      })

      insights.push({
        type: 'energy_low',
        title: 'Tu hora de menor energía',
        description: `A las ${lowHour.hour}:00 promedias ${lowHour.avg}/10 de energía`,
        actionable: 'Evita tareas cognitivas demandantes'
      })
    }

    // Creative blocks pattern
    if (creativeStats && creativeStats.totalBlocks > 0) {
      const bestType = Object.entries(creativeStats.byType || {})
        .sort((a, b) => b[1] - a[1])[0]

      if (bestType) {
        insights.push({
          type: 'creative_type',
          title: `Tu tipo de bloque favorito: ${getBlockTypeLabel(bestType[0])}`,
          description: `${bestType[1]} bloques esta semana`,
          actionable: 'Mantén este tipo para sesiones futuras'
        })
      }

      if (creativeStats.avgQuality) {
        insights.push({
          type: 'quality',
          title: `Calidad promedio: ${creativeStats.avgQuality}/10`,
          description: `${creativeStats.withQualityScore} de ${creativeStats.totalBlocks} bloques con score`,
          actionable: creativeStats.avgQuality < 6 ? 'Intenta reducir interrupciones' : '¡Buen trabajo manteniendo la calidad!'
        })
      }
    }

    // Correlation insight
    if (energyQualityCorrelation) {
      const { correlation, interpretation } = energyQualityCorrelation
      if (interpretation === 'positive') {
        insights.push({
          type: 'correlation',
          title: 'Energía alta = Mejor deep work',
          description: `Correlación ${correlation > 0 ? '+' : ''}${Math.round(correlation * 100)}% entre energía al inicio y calidad`,
          actionable: 'Programa bloques creativos en tus horas pico de energía'
        })
      }
    }

    // Completion rate insight
    if (progress) {
      const rate = progress.completionRate || 0
      insights.push({
        type: 'completion',
        title: `Tasa de completado: ${rate}%`,
        description: `${progress.completed || 0} de ${progress.scheduled + progress.completed + progress.failed || 1} tareas completadas`,
        actionable: rate < 50 ? 'Considera reducir carga o dividir tareas' : rate > 80 ? '¡Excelente ritmo!' : 'Buen progreso'
      })
    }

    return insights
  }, [energyData, creativeStats, progress, energyQualityCorrelation])

  return {
    // Raw data
    energyData,
    creativeBlocks,
    creativeStats,
    progress,
    habitConsistency,

    // Computed
    energyHeatmap,
    energyByDayHour,
    avgEnergyByHour,
    detectedPeakHours,
    creativeBlocksByDay,
    blocksWithEnergy,
    energyQualityCorrelation,
    bestDeepWorkDays,
    insights,

    // State
    loading,
    error,

    // Actions
    reload: loadAll
  }
}

// Helper: calculate Pearson correlation
function calculateCorrelation(x: number[], y: number[]) {
  const n = x.length
  if (n !== y.length || n < 2) return 0

  const sumX = x.reduce((a, b) => a + b, 0)
  const sumY = y.reduce((a, b) => a + b, 0)
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0)
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0)
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0)

  const numerator = n * sumXY - sumX * sumY
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))

  return denominator === 0 ? 0 : numerator / denominator
}

// Helper: get block duration in minutes
function getBlockDuration(block: Pick<CreativeBlock, 'start_time' | 'end_time'>) {
  const start = new Date(`2000-01-01T${block.start_time}`)
  const end = new Date(`2000-01-01T${block.end_time}`)
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60))
}

// Helper: get block type label
function getBlockTypeLabel(type: string) {
  const labels: Record<string, string> = {
    deep_work: 'Deep Work',
    shallow_work: 'Shallow Work',
    creative: 'Creativo',
    learning: 'Aprendizaje',
    admin: 'Admin'
  }
  return labels[type] || type
}