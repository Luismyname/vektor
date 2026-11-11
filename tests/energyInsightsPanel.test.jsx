import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { useEnergyInsights, useLowEnergyDay } = vi.hoisted(() => ({
  useEnergyInsights: vi.fn(),
  useLowEnergyDay: vi.fn(),
}))

vi.mock('../src/hooks/useEnergyInsights', () => ({ useEnergyInsights }))
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

describe('VektorPanel energy pattern', () => {
  it('shows best and worst four-hour windows, sample count, and confidence', () => {
    useLowEnergyDay.mockReturnValue({
      isLowEnergy: false,
      reasons: [],
      loading: false,
      error: '',
      reload: vi.fn(),
    })
    useEnergyInsights.mockReturnValue({
      bestWindow: { startHour: 9, endHour: 13 },
      worstWindow: { startHour: 16, endHour: 20 },
      hourlyProfile: [],
      sampleCount: 42,
      confidence: 'medium',
      loading: false,
      error: '',
      reload: vi.fn(),
    })

    render(<VektorPanel {...panelProps} />)

    expect(screen.getByRole('heading', { name: '⚡ Patrón energético' })).toBeInTheDocument()
    expect(screen.getByText('09:00 - 13:00')).toBeInTheDocument()
    expect(screen.getByText('16:00 - 20:00')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('Media')).toBeInTheDocument()
  })

  it('does not show fabricated windows when there is insufficient coverage', () => {
    useLowEnergyDay.mockReturnValue({
      isLowEnergy: false,
      reasons: [],
      loading: false,
      error: '',
      reload: vi.fn(),
    })
    useEnergyInsights.mockReturnValue({
      bestWindow: null,
      worstWindow: null,
      hourlyProfile: [],
      sampleCount: 4,
      confidence: 'insufficient',
      loading: false,
      error: '',
      reload: vi.fn(),
    })

    render(<VektorPanel {...panelProps} />)

    expect(screen.getByText(/mínimo 3 por hora/)).toBeInTheDocument()
    expect(screen.queryByText(/Mejor franja/)).not.toBeInTheDocument()
  })
})
