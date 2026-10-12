import { useMemo, useState, useEffect, useCallback } from 'react'
import { 
  saveEnergyCheckIn, 
  getWeeklyEnergyLevels, 
  getTodayEnergyCheckIn, 
  getUserChronotype, 
  updateUserChronotype, 
  updateUserPeakHours,
  detectChronotype,
  getUserPeakHours
} from '../../services/energy'

/**
 * Hook para gestionar el perfil de energía del usuario
 * Incluye check-in matutino, cronotipo, horas pico y visualización
 */
export function useEnergyProfile(userId, weekStart) {
  const [chronotype, setChronotype] = useState(null)
  const [peakHours, setPeakHours] = useState({ morning: [], afternoon: [], evening: [] })
  const [weeklyEnergy, setWeeklyEnergy] = useState([])
  const [todayCheckIn, setTodayCheckIn] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Cargar datos iniciales
  useEffect(() => {
    if (!userId) return

    let active = true

    async function loadData() {
      setLoading(true)
      setError(null)

      try {
        const [{ data: chronotypeData }, { data: todayCheckIn }, { data: weeklyEnergy }] = await Promise.all([
          getUserChronotype(userId),
          getTodayEnergyCheckIn(userId),
          getWeeklyEnergyLevels(userId, weekStart),
        ])

        if (!active) return

        if (chronotypeData) setChronotype(chronotypeData.chronotype)
        if (todayCheckIn) setTodayCheckIn(todayCheckIn)
        if (weeklyEnergy) setWeeklyEnergy(weeklyEnergy)

        // Derivar peak_hours del cronotipo si no existe
        // Nota: peakHours se cargaría desde profiles si existe
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadData()
    return () => { active = false }
  }, [userId, weekStart])

  // Guardar check-in de energía
  const saveCheckIn = useCallback(async (hour, energyLevel, source = 'manual') => {
    if (!userId) return { error: new Error('No user') }

    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await saveEnergyCheckIn(userId, today, hour, energyLevel, source)

    if (!error) {
      setTodayCheckIn(data)
      // Actualizar lista semanal
      setWeeklyEnergy(prev => {
        const exists = prev.find(e => e.date === today && e.hour === hour)
        if (exists) {
          return prev.map(e => e.date === today && e.hour === hour ? data : e)
        }
        return [...prev, data]
      })
    }
    return { data, error }
  }, [userId])

  // Actualizar cronotipo
  const saveChronotype = useCallback(async (newChronotype) => {
    if (!userId) return { error: new Error('No user') }

    const { data, error } = await updateUserChronotype(userId, newChronotype)
    if (!error) setChronotype(newChronotype)
    return { data, error }
  }, [userId])

  // Actualizar peak hours
  const savePeakHours = useCallback(async (newPeakHours) => {
    if (!userId) return { error: new Error('No user') }

    const { data, error } = await updateUserPeakHours(userId, newPeakHours)
    if (!error) setPeakHours(newPeakHours)
    return { data, error }
  }, [userId])

  // Detectar cronotipo automáticamente
  const autoDetectChronotype = useCallback(async () => {
    if (!userId) return

    const { data: weeklyEnergy } = await getWeeklyEnergyLevels(userId, weekStart)
    if (weeklyEnergy?.length) {
      const detected = detectChronotype(weeklyEnergy)
      if (detected) {
        await updateUserChronotype(userId, detected)
        setChronotype(detected)
      }
    }
  }, [userId, weekStart])

  // Obtener peak hours actuales (combinando BD + cronotipo)
  const effectivePeakHours = useMemo(() => {
    if (peakHours && Object.keys(peakHours).some(k => peakHours[k].length > 0)) {
      return peakHours
    }
    return getUserPeakHours(chronotype, {})
  }, [peakHours, chronotype])

  // Verificar si ya hay check-in hoy
  const hasCheckInToday = !!todayCheckIn

  return {
    // Estado
    chronotype,
    setChronotype: saveChronotype,
    peakHours: effectivePeakHours,
    setPeakHours: savePeakHours,
    weeklyEnergy,
    todayCheckIn,
    loading,
    error,

    // Acciones
    saveCheckIn,
    saveChronotype,
    savePeakHours,
    autoDetectChronotype,

    // Helpers
    hasCheckInToday,
  }
}