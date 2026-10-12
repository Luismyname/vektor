import { supabase } from './supabase'

// Tipos de notificación
export const NOTIFICATION_TYPES = {
  ENERGY_CHECKIN: 'energy_checkin',
  DEEP_WORK_START: 'deep_work_start',
  HABIT_REMINDER: 'habit_reminder',
  WEEKLY_REVIEW: 'weekly_review',
  FOCUS_SESSION_END: 'focus_session_end',
}

// Configuración por defecto
export const DEFAULT_NOTIFICATION_CONFIG = {
  [NOTIFICATION_TYPES.ENERGY_CHECKIN]: { enabled: true, time: '07:00', days: [1,2,3,4,5,6,0] },
  [NOTIFICATION_TYPES.DEEP_WORK_START]: { enabled: true, beforeMinutes: 5, days: [1,2,3,4,5,6,0] },
  [NOTIFICATION_TYPES.HABIT_REMINDER]: { enabled: true, beforeMinutes: 10, days: [1,2,3,4,5,6,0] },
  [NOTIFICATION_TYPES.WEEKLY_REVIEW]: { enabled: true, day: 0, time: '18:00' }, // Domingo
  [NOTIFICATION_TYPES.FOCUS_SESSION_END]: { enabled: true },
}

// Verificar soporte de notificaciones
export function isNotificationSupported() {
  return 'Notification' in window && 'serviceWorker' in navigator
}

// Solicitar permiso
export async function requestNotificationPermission() {
  if (!isNotificationSupported()) return { granted: false, error: 'No soportado' }

  try {
    const permission = await Notification.requestPermission()
    return { granted: permission === 'granted', permission }
  } catch (err) {
    return { granted: false, error: err.message }
  }
}

// Obtener configuración del usuario
export async function getNotificationConfig(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('notification_config')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) return { config: DEFAULT_NOTIFICATION_CONFIG, error }

  return { config: data?.notification_config || DEFAULT_NOTIFICATION_CONFIG, error: null }
}

// Guardar configuración
export async function saveNotificationConfig(userId, config) {
  const { error } = await supabase
    .from('profiles')
    .update({ notification_config: config })
    .eq('user_id', userId)

  return { error }
}

// Mostrar notificación local
export function showLocalNotification(title, options = {}) {
  if (!isNotificationSupported()) return
  if (Notification.permission !== 'granted') return

  const defaultOptions = {
    icon: '/vite.svg',
    badge: '/vite.svg',
    tag: 'vektor-notification',
    renotify: true,
    requireInteraction: false,
    ...options,
  }

  // Usar Service Worker si está disponible
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SHOW_NOTIFICATION',
      title,
      options: defaultOptions,
    })
  } else {
    new Notification(title, defaultOptions)
  }
}

// Programar notificaciones usando setTimeout (fallback simple)
const scheduledTimeouts = new Map()

export function scheduleNotification(type, triggerTime, title, body, data = {}) {
  const now = Date.now()
  const delay = triggerTime - now

  if (delay <= 0) return false

  const timeoutId = setTimeout(() => {
    showLocalNotification(title, { body, data: { type, ...data } })
    scheduledTimeouts.delete(type)
  }, delay)

  scheduledTimeouts.set(type, timeoutId)
  return true
}

export function cancelScheduledNotification(type) {
  const timeoutId = scheduledTimeouts.get(type)
  if (timeoutId) {
    clearTimeout(timeoutId)
    scheduledTimeouts.delete(type)
    return true
  }
  return false
}

export function cancelAllScheduled() {
  scheduledTimeouts.forEach(id => clearTimeout(id))
  scheduledTimeouts.clear()
}

// Calcular próximo trigger para check-in energía
export function getNextEnergyCheckinTime(config) {
  const now = new Date()
  const [hours, minutes] = config.time.split(':').map(Number)

  const target = new Date(now)
  target.setHours(hours, minutes, 0, 0)

  // Si ya pasó hoy, programar para mañana
  if (target <= now) {
    target.setDate(target.getDate() + 1)
  }

  // Verificar si el día está habilitado
  const day = target.getDay()
  if (!config.days.includes(day)) {
    // Buscar siguiente día habilitado
    for (let i = 1; i <= 7; i++) {
      const nextDay = (day + i) % 7
      if (config.days.includes(nextDay)) {
        target.setDate(target.getDate() + i)
        break
      }
    }
  }

  return target.getTime()
}

// Calcular próximo trigger para revisión semanal
export function getNextWeeklyReviewTime(config) {
  const now = new Date()
  const [hours, minutes] = config.time.split(':').map(Number)

  const target = new Date(now)
  target.setHours(hours, minutes, 0, 0)

  // Ajustar al día configurado (0=domingo)
  const targetDay = config.day
  const currentDay = target.getDay()
  let daysUntil = (targetDay - currentDay + 7) % 7
  if (daysUntil === 0 && target <= now) daysUntil = 7

  target.setDate(target.getDate() + daysUntil)

  return target.getTime()
}

// Inicializar todas las notificaciones programadas
export async function initializeScheduledNotifications(userId) {
  const { config } = await getNotificationConfig(userId)

  cancelAllScheduled()

  // Energy check-in
  if (config[NOTIFICATION_TYPES.ENERGY_CHECKIN]?.enabled) {
    const triggerTime = getNextEnergyCheckinTime(config[NOTIFICATION_TYPES.ENERGY_CHECKIN])
    scheduleNotification(
      NOTIFICATION_TYPES.ENERGY_CHECKIN,
      triggerTime,
      '⚡ Check-in de energía',
      '¿Cómo estás de energía ahora? (1-10)',
      { type: NOTIFICATION_TYPES.ENERGY_CHECKIN }
    )
  }

  // Weekly review
  if (config[NOTIFICATION_TYPES.WEEKLY_REVIEW]?.enabled) {
    const triggerTime = getNextWeeklyReviewTime(config[NOTIFICATION_TYPES.WEEKLY_REVIEW])
    scheduleNotification(
      NOTIFICATION_TYPES.WEEKLY_REVIEW,
      triggerTime,
      '📊 Revisión semanal',
      '¿Cómo fue tu semana? Completa tu review',
      { type: NOTIFICATION_TYPES.WEEKLY_REVIEW }
    )
  }

  // Deep work y habit reminders se programan dinámicamente desde el planner
  return true
}

// Notificación para inicio de deep work
export function notifyDeepWorkStart(blockTitle, startTime, blockId) {
  showLocalNotification('🧠 Deep Work inicia', {
    body: `${blockTitle} a las ${startTime}`,
    data: { type: NOTIFICATION_TYPES.DEEP_WORK_START, blockId },
    requireInteraction: true,
    actions: [
      { action: 'start', title: 'Iniciar sesión' },
      { action: 'snooze', title: 'Posponer 10 min' },
    ],
  })
}

// Notificación para hábito
export function notifyHabit(habitTitle, startTime, habitId) {
  showLocalNotification('🌱 Hábito programado', {
    body: `${habitTitle} a las ${startTime}`,
    data: { type: NOTIFICATION_TYPES.HABIT_REMINDER, habitId },
    actions: [
      { action: 'complete', title: 'Completado' },
      { action: 'snooze', title: 'Posponer' },
    ],
  })
}

// Notificación fin de sesión de enfoque
export function notifyFocusSessionEnd(sessionId, durationMinutes) {
  showLocalNotification('✅ Sesión completada', {
    body: `Trabajaste ${durationMinutes} min. ¿Cómo fue? (1-10)`,
    data: { type: NOTIFICATION_TYPES.FOCUS_SESSION_END, sessionId },
    requireInteraction: true,
    actions: [
      { action: 'rate', title: 'Calificar' },
      { action: 'skip', title: 'Omitir' },
    ],
  })
}