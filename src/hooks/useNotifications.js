import { useState, useEffect, useCallback } from 'react'
import {
  requestNotificationPermission,
  getNotificationConfig,
  saveNotificationConfig,
  initializeScheduledNotifications,
  DEFAULT_NOTIFICATION_CONFIG,
} from '../services/notifications'

/**
 * Hook para gestionar notificaciones
 */
export function useNotifications(userId) {
  const [permission, setPermission] = useState(Notification.permission)
  const [config, setConfig] = useState(DEFAULT_NOTIFICATION_CONFIG)
  const [loading, setLoading] = useState(true)

  // Cargar config y permiso al montar
  useEffect(() => {
    if (!userId) return

    const init = async () => {
      setLoading(true)
      const perm = Notification.permission
      setPermission(perm)

      const { config: userConfig } = await getNotificationConfig(userId)
      setConfig(userConfig)

      // Inicializar notificaciones programadas si hay permiso
      if (perm === 'granted') {
        await initializeScheduledNotifications(userId)
      }
      setLoading(false)
    }

    init()
  }, [userId])

  // Solicitar permiso
  const askPermission = useCallback(async () => {
    const { granted, permission: newPerm } = await requestNotificationPermission()
    setPermission(newPerm)
    if (granted && userId) {
      await initializeScheduledNotifications(userId)
    }
    return granted
  }, [userId])

  // Actualizar config
  const updateConfig = useCallback(async (type, updates) => {
    if (!userId) return { error: new Error('No user') }

    const newConfig = { ...config, [type]: { ...config[type], ...updates } }
    const { error } = await saveNotificationConfig(userId, newConfig)

    if (!error) {
      setConfig(newConfig)
      // Re-inicializar programadas
      await initializeScheduledNotifications(userId)
    }
    return { error }
  }, [config, userId])

  // Toggle enabled
  const toggleEnabled = useCallback(async (type) => {
    const current = config[type]?.enabled ?? false
    return updateConfig(type, { enabled: !current })
  }, [config, updateConfig])

  // Actualizar hora
  const updateTime = useCallback(async (type, time) => {
    return updateConfig(type, { time })
  }, [updateConfig])

  // Actualizar días
  const updateDays = useCallback(async (type, days) => {
    return updateConfig(type, { days })
  }, [updateConfig])

  return {
    permission,
    config,
    loading,
    askPermission,
    updateConfig,
    toggleEnabled,
    updateTime,
    updateDays,
    isSupported: 'Notification' in window,
  }
}

// Helper para formatear días
export const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export function formatDays(days) {
  if (!days?.length) return 'Nunca'
  if (days.length === 7) return 'Todos los días'
  return days.map(d => DAY_LABELS[d]).join(', ')
}