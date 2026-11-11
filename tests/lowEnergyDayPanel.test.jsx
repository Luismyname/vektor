import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { useLowEnergyDay } = vi.hoisted(() => ({ useLowEnergyDay: vi.fn() }))

vi.mock('../src/hooks/useLowEnergyDay', () => ({ useLowEnergyDay }))

import { VektorPanel } from '../src/app/weekly-planner/VektorPanel'

const panelProps = {
  analytics: { insights: [], energyByDayHour: {}, progress: null },
  entries: [],
  taskById: {},
  habitById: {},
  currentTime: new Date('2026-11-11T12:00:00'),
  userId: 'user-1',
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('VektorPanel low-energy notice', () => {
  it('shows detection reasons and only displays suggestions after the user applies them', () => {
    useLowEnergyDay.mockReturnValue({
      isLowEnergy: true,
      reasons: ['Has dormido menos de 6 horas', 'Tu calidad de sueño es baja'],
      loading: false,
      error: '',
      reload: vi.fn(),
    })
    const entries = [{ id: 'planner-entry-1', task_id: 'task-1', date: '2026-11-11' }]

    render(<VektorPanel {...panelProps} entries={entries} />)

    expect(screen.getByText('⚠ Día de energía baja detectado')).toBeInTheDocument()
    expect(screen.getByText('Has dormido menos de 6 horas')).toBeInTheDocument()
    expect(screen.getByText('Tu calidad de sueño es baja')).toBeInTheDocument()
    expect(screen.queryByText('Dividir tareas grandes')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Aplicar sugerencias' }))

    expect(screen.getByText('Dividir tareas grandes')).toBeInTheDocument()
    expect(screen.getByText('Reducir la carga cognitiva')).toBeInTheDocument()
    expect(screen.getByText('Priorizar tareas ligeras')).toBeInTheDocument()
    expect(entries).toEqual([{ id: 'planner-entry-1', task_id: 'task-1', date: '2026-11-11' }])
  })

  it('hides the notice when criteria are not met', () => {
    useLowEnergyDay.mockReturnValue({
      isLowEnergy: false,
      reasons: [],
      loading: false,
      error: '',
      reload: vi.fn(),
    })

    render(<VektorPanel {...panelProps} />)

    expect(screen.queryByText('⚠ Día de energía baja detectado')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Aplicar sugerencias' })).not.toBeInTheDocument()
  })

  it('lets the user ignore the notice for the current day', () => {
    useLowEnergyDay.mockReturnValue({
      isLowEnergy: true,
      reasons: ['Tu check-in energético inicial es bajo'],
      loading: false,
      error: '',
      reload: vi.fn(),
    })

    const { rerender } = render(<VektorPanel {...panelProps} />)
    fireEvent.click(screen.getByRole('button', { name: 'Ignorar' }))
    rerender(<VektorPanel {...panelProps} />)

    expect(screen.queryByText('⚠ Día de energía baja detectado')).not.toBeInTheDocument()
  })
})
