import { describe, expect, it } from 'vitest'
import { formatDate, getTimeRange, getWeekDates, getWeekStart, shiftWeek } from '../src/services/weekly-planner'

describe('fechas del planificador semanal', () => {
  it('formatea fechas Date e ISO como YYYY-MM-DD', () => {
    expect(formatDate(new Date(2026, 8, 28, 0, 0, 0))).toBe('2026-09-28')
    expect(formatDate('2026-09-28')).toBe('2026-09-28')
  })

  it('permite navegar hacia semanas anteriores y siguientes desde un Date', () => {
    const weekStart = getWeekStart(new Date(2026, 8, 30, 12, 0, 0))

    expect(formatDate(shiftWeek(weekStart, -1))).toBe('2026-09-21')
    expect(formatDate(shiftWeek(weekStart, 1))).toBe('2026-10-05')
  })

  it('genera siete fechas ISO únicas tras cambiar de semana', () => {
    const nextWeek = shiftWeek(getWeekStart(new Date(2026, 8, 30, 12, 0, 0)), 1)
    const dates = getWeekDates(nextWeek)

    expect(dates).toHaveLength(7)
    expect(new Set(dates).size).toBe(7)
    expect(dates[0]).toBe('2026-10-05')
    expect(dates[6]).toBe('2026-10-11')
    expect(dates.every((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))).toBe(true)
  })

  it('calcula el rango horario a partir de la hora de inicio y la duración', () => {
    expect(getTimeRange('09:00', 30)).toEqual({ startTime: '09:00', endTime: '09:30' })
    expect(getTimeRange('09:15', 45)).toEqual({ startTime: '09:15', endTime: '10:00' })
    expect(getTimeRange('22:30', 90)).toEqual({ startTime: '22:30', endTime: '00:00' })
  })
})