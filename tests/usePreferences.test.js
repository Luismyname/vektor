import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePreferences } from '../src/hooks/usePreferences'

describe('usePreferences', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  afterEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  it('debe retornar preferencias por defecto cuando no hay datos guardados', () => {
    const { result } = renderHook(() => usePreferences())

    expect(result.current.preferences).toEqual({
      theme: 'dark',
      timerMinutes: 25,
      sounds: false,
      showValues: true,
    })
  })

  it('debe leer preferencias de localStorage', () => {
    const savedPreferences = {
      theme: 'light',
      timerMinutes: 30,
      sounds: true,
      showValues: false,
    }
    localStorage.setItem('vektor-preferences', JSON.stringify(savedPreferences))

    const { result } = renderHook(() => usePreferences())

    expect(result.current.preferences).toEqual(savedPreferences)
  })

  it('debe actualizar una preferencia correctamente', () => {
    const { result } = renderHook(() => usePreferences())

    act(() => {
      result.current.updatePreference('theme', 'light')
    })

    expect(result.current.preferences.theme).toBe('light')
  })

  it('debe actualizar timerMinutes correctamente', () => {
    const { result } = renderHook(() => usePreferences())

    act(() => {
      result.current.updatePreference('timerMinutes', 45)
    })

    expect(result.current.preferences.timerMinutes).toBe(45)
  })

  it('debe persistir preferencias en localStorage', () => {
    const { result } = renderHook(() => usePreferences())

    act(() => {
      result.current.updatePreference('sounds', true)
    })

    const saved = JSON.parse(localStorage.getItem('vektor-preferences'))
    expect(saved.sounds).toBe(true)
  })

  it('debe aplicar el tema al documento', () => {
    const { result } = renderHook(() => usePreferences())

    act(() => {
      result.current.updatePreference('theme', 'light')
    })

    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('debe mantener otras preferencias al actualizar una', () => {
    const { result } = renderHook(() => usePreferences())

    act(() => {
      result.current.updatePreference('theme', 'light')
    })

    expect(result.current.preferences).toEqual({
      theme: 'light',
      timerMinutes: 25,
      sounds: false,
      showValues: true,
    })
  })

  it('debe manejar valores inválidos en localStorage', () => {
    localStorage.setItem('vektor-preferences', 'invalid json')

    const { result } = renderHook(() => usePreferences())

    expect(result.current.preferences).toEqual({
      theme: 'dark',
      timerMinutes: 25,
      sounds: false,
      showValues: true,
    })
  })
})
