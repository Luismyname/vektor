import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { sleepService } = vi.hoisted(() => ({
  sleepService: {
    getSleepHistory: vi.fn(),
    getSleepRecord: vi.fn(),
    saveSleepRecord: vi.fn(),
    updateSleepRecord: vi.fn(),
  },
}))

vi.mock('../src/services/sleep', () => sleepService)

import { VektorPanel } from '../src/app/weekly-planner/VektorPanel'

const panelProps = {
  analytics: { insights: [], energyByDayHour: {}, progress: null },
  entries: [],
  taskById: {},
  habitById: {},
  currentTime: new Date('2026-11-11T12:00:00'),
  userId: 'user-1',
}

const existingRecord = {
  id: 'sleep-1',
  user_id: 'user-1',
  sleep_date: '2026-11-10',
  hours_slept: 7.5,
  sleep_quality: 8,
  sleep_medication: true,
  notes: 'Me desperté una vez',
  sleep_start: '23:00:00',
  sleep_end: '06:30:00',
  created_at: '2026-11-11T00:00:00Z',
  updated_at: '2026-11-11T00:00:00Z',
}

afterEach(cleanup)

describe('sleep record modal integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sleepService.getSleepRecord.mockResolvedValue({ data: null, error: null })
    sleepService.getSleepHistory.mockResolvedValue({ data: [], error: null })
    sleepService.saveSleepRecord.mockImplementation(async (_userId, input) => ({
      data: { ...existingRecord, ...input, id: 'sleep-new' },
      error: null,
    }))
    sleepService.updateSleepRecord.mockResolvedValue({ data: existingRecord, error: null })
  })

  it('creates a record from the VektorPanel action and refreshes history', async () => {
    render(<VektorPanel {...panelProps} />)
    fireEvent.click(screen.getByRole('button', { name: 'Registrar sueño' }))

    await screen.findByRole('dialog', { name: 'Registrar sueño' })
    fireEvent.change(screen.getByLabelText('Horas dormidas'), { target: { value: '7.5' } })
    fireEvent.change(screen.getByLabelText('Calidad del sueño (1-10)'), { target: { value: '8' } })
    fireEvent.change(screen.getByLabelText('¿Tomaste medicación para dormir?'), { target: { value: 'true' } })
    fireEvent.change(screen.getByLabelText('Notas (opcional)'), { target: { value: 'Buen descanso' } })
    fireEvent.change(screen.getByLabelText('Hora de inicio (opcional)'), { target: { value: '23:00' } })
    fireEvent.change(screen.getByLabelText('Hora de fin (opcional)'), { target: { value: '06:30' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar registro' }))

    await waitFor(() => expect(sleepService.saveSleepRecord).toHaveBeenCalledWith('user-1', expect.objectContaining({
      hours_slept: 7.5,
      sleep_quality: 8,
      sleep_medication: true,
      notes: 'Buen descanso',
      sleep_start: '23:00',
      sleep_end: '06:30',
    })))
    expect(sleepService.getSleepHistory).toHaveBeenCalledTimes(2)
    expect(await screen.findByRole('button', { name: /Actualizar registro/ })).toBeInTheDocument()
  })

  it('loads an existing date and updates its record', async () => {
    sleepService.getSleepRecord.mockResolvedValue({ data: existingRecord, error: null })
    sleepService.getSleepHistory.mockResolvedValue({ data: [existingRecord], error: null })

    render(<VektorPanel {...panelProps} />)
    fireEvent.click(screen.getByRole('button', { name: 'Registrar sueño' }))

    const dateInput = await screen.findByLabelText('Fecha del sueño')
    fireEvent.change(dateInput, { target: { value: existingRecord.sleep_date } })

    await waitFor(() => expect(screen.getByLabelText('Horas dormidas')).toHaveValue(7.5))
    expect(screen.getByLabelText('¿Tomaste medicación para dormir?')).toHaveValue('true')

    fireEvent.change(screen.getByLabelText('Notas (opcional)'), { target: { value: 'Sueño actualizado' } })
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar registro' }))

    await waitFor(() => expect(sleepService.updateSleepRecord).toHaveBeenCalledWith(
      'user-1',
      'sleep-1',
      expect.objectContaining({ notes: 'Sueño actualizado', sleep_date: existingRecord.sleep_date }),
    ))
  })

  it('loads a history entry when selected', async () => {
    sleepService.getSleepHistory.mockResolvedValue({ data: [existingRecord], error: null })
    sleepService.getSleepRecord.mockResolvedValue({ data: existingRecord, error: null })

    render(<VektorPanel {...panelProps} />)
    fireEvent.click(screen.getByRole('button', { name: 'Registrar sueño' }))
    fireEvent.click(await screen.findByRole('button', { name: /10 nov 2026 · 7.5 h/i }))

    await waitFor(() => expect(sleepService.getSleepRecord).toHaveBeenCalledWith('user-1', existingRecord.sleep_date))
    expect(await screen.findByRole('button', { name: 'Actualizar registro' })).toBeInTheDocument()
  })

  it('prevents a duplicate create when checking the selected date fails', async () => {
    sleepService.getSleepRecord.mockResolvedValue({
      data: null,
      error: new Error('No se pudo consultar sleep_records'),
    })

    render(<VektorPanel {...panelProps} />)
    fireEvent.click(screen.getByRole('button', { name: 'Registrar sueño' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Reintenta antes de guardar')
    expect(screen.getByRole('button', { name: 'Guardar registro' })).toBeDisabled()
    expect(sleepService.saveSleepRecord).not.toHaveBeenCalled()
  })
})
