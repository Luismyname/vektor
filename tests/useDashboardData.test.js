import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useDashboardData } from '../src/app/dashboard/hooks/useDashboardData'

// Mock de los servicios
vi.mock('../src/services/auth', () => ({
  getAuthenticatedUser: vi.fn(),
  getCurrentProfile: vi.fn(),
}))

vi.mock('../src/services/activity', () => ({
  getRecentActivity: vi.fn(),
}))

vi.mock('../src/services/tasks', () => ({
  getTasks: vi.fn(),
}))

vi.mock('../src/services/focus-sessions', () => ({
  getActiveFocusSession: vi.fn(),
}))

import { getAuthenticatedUser, getCurrentProfile } from '../src/services/auth'
import { getRecentActivity } from '../src/services/activity'
import { getTasks } from '../src/services/tasks'
import { getActiveFocusSession } from '../src/services/focus-sessions'

afterEach(() => {
  vi.clearAllMocks()
})

describe('useDashboardData', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' }
  const mockProfile = {
    id: 'profile-123',
    user_id: 'user-123',
    dominant_value: 'Honestidad',
    secondary_value: 'Perseverancia',
    habits: ['Ejercicio', 'Lectura'],
    answers: { 1: 'Respuesta 1' },
    hidden_answers: {},
    completed_onboarding: true,
  }
  const mockTasks = [
    { id: 'task-1', title: 'Tarea 1', status: 'pending' },
    { id: 'task-2', title: 'Tarea 2', status: 'completed' },
  ]
  const mockActivities = [
    { id: 'act-1', type: 'completed', task_id: 'task-2' },
  ]

  beforeEach(() => {
    getAuthenticatedUser.mockResolvedValue({ user: mockUser, error: null })
    getCurrentProfile.mockResolvedValue({ profile: mockProfile, error: null })
    getTasks.mockResolvedValue({ tasks: mockTasks, error: null })
    getRecentActivity.mockResolvedValue({ activities: mockActivities, error: null })
    getActiveFocusSession.mockResolvedValue({ session: null, error: null })
  })

  it('debe cargar los datos del dashboard correctamente', async () => {
    const { result } = renderHook(() => useDashboardData(25))

    // Inicialmente está cargando
    expect(result.current.user).toBeNull()
    expect(result.current.profile).toBeNull()

    // Esperar a que carguen los datos
    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.profile).toEqual(mockProfile)
      expect(result.current.tasks).toEqual(mockTasks)
      expect(result.current.activities).toEqual(mockActivities)
    })
  })

  it('debe manejar error de autenticación', async () => {
    getAuthenticatedUser.mockResolvedValue({ user: null, error: { message: 'No autenticado' } })

    const { result } = renderHook(() => useDashboardData(25))

    await waitFor(() => {
      expect(result.current.error).toBe('No se pudo cargar la sesión.')
    })
  })

  it('debe manejar error de perfil', async () => {
    getCurrentProfile.mockResolvedValue({ profile: null, error: { message: 'Error de perfil' } })

    const { result } = renderHook(() => useDashboardData(25))

    await waitFor(() => {
      expect(result.current.error).toBe('No se pudo cargar tu perfil.')
    })
  })

  it('debe inicializar hiddenAnswers como objeto vacío', async () => {
    const { result } = renderHook(() => useDashboardData(25))

    await waitFor(() => {
      expect(result.current.hiddenAnswers).toEqual({})
    })
  })

  it('debe usar hiddenAnswers del perfil si existe', async () => {
    const profileWithHidden = {
      ...mockProfile,
      hidden_answers: { '1': true },
    }
    getCurrentProfile.mockResolvedValue({ profile: profileWithHidden, error: null })

    const { result } = renderHook(() => useDashboardData(25))

    await waitFor(() => {
      expect(result.current.hiddenAnswers).toEqual({ '1': true })
    })
  })

  it('debe detectar tarea activa en actividades', async () => {
    const activitiesWithActive = [
      { id: 'act-1', type: 'in_progress', task_id: 'task-1', duration: 25 },
    ]
    getRecentActivity.mockResolvedValue({ activities: activitiesWithActive, error: null })

    const { result } = renderHook(() => useDashboardData(25))

    await waitFor(() => {
      expect(result.current.activeTask).toBeTruthy()
      expect(result.current.activeTask.id).toBe('task-1')
    })
  })

  it('debe recuperar la sesión de enfoque activa del usuario', async () => {
    const activeSession = { id: 'focus-1', task_id: 'task-1', status: 'paused' }
    getActiveFocusSession.mockResolvedValue({ session: activeSession, error: null })

    const { result } = renderHook(() => useDashboardData(25))

    await waitFor(() => {
      expect(result.current.activeFocusSession).toEqual(activeSession)
    })
    expect(getActiveFocusSession).toHaveBeenCalledWith('user-123')
  })

  it('debe retornar null como activeTask si no hay actividad en progreso', async () => {
    const { result } = renderHook(() => useDashboardData(25))

    await waitFor(() => {
      expect(result.current.activeTask).toBeNull()
    })
  })

  it('debe permitir refreshDashboard', async () => {
    const { result } = renderHook(() => useDashboardData(25))

    await waitFor(() => {
      expect(result.current.user).toBeTruthy()
    })

    // Llamar refreshDashboard
    await result.current.refreshDashboard('user-123')

    expect(getTasks).toHaveBeenCalledTimes(2)
    expect(getRecentActivity).toHaveBeenCalledTimes(2)
  })

  it('debe usar defaultDuration correctamente', async () => {
    const { result } = renderHook(() => useDashboardData(30))

    await waitFor(() => {
      expect(result.current.user).toBeTruthy()
    })

    // El hook debería usar 30 como defaultDuration
    expect(result.current.activeTask).toBeNull()
  })
})
