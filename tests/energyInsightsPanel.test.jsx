import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { useEnergyInsights, useLowEnergyDay, useRecommendations, useLearningPatterns, useEnergyImpacts } = vi.hoisted(() => ({
  useEnergyInsights: vi.fn(),
  useLowEnergyDay: vi.fn(),
  useRecommendations: vi.fn(),
  useLearningPatterns: vi.fn(),
  useEnergyImpacts: vi.fn(() => ({ summaries: [], loading: false, error: '', reload: vi.fn() })),
}))

vi.mock('../src/hooks/useEnergyInsights', () => ({ useEnergyInsights }))
vi.mock('../src/hooks/useLowEnergyDay', () => ({ useLowEnergyDay }))
vi.mock('../src/hooks/useRecommendations', () => ({ useRecommendations }))
vi.mock('../src/hooks/useLearningPatterns', () => ({ useLearningPatterns }))
vi.mock('../src/hooks/useEnergyImpacts', () => ({ useEnergyImpacts }))

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
  beforeEach(() => {
    useRecommendations.mockReturnValue({ recommendations: [], loading: false, error: '', reload: vi.fn() })
    useLearningPatterns.mockReturnValue({ patterns: [], loading: false, error: '', reload: vi.fn() })
    useEnergyImpacts.mockReturnValue({ summaries: [], loading: false, error: '', reload: vi.fn() })
  })

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

  it('shows recorded energy impact and does not infer unavailable activity details', () => {
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
      sampleCount: 0,
      confidence: 'insufficient',
      loading: false,
      error: '',
    })
    useEnergyImpacts.mockReturnValue({
      summaries: [{
        activityId: 'habit-1',
        impactType: 'habit',
        averageImpact: 2,
        sampleCount: 8,
        confidence: 0.8,
        classification: 'recovery',
        trend: 'improving',
        previousAverage: -1,
        recentAverage: 1,
      }],
      loading: false,
      error: '',
      reload: vi.fn(),
    })

    render(<VektorPanel {...panelProps} />)

    expect(screen.getByRole('heading', { name: '⚡ Impacto Energético' })).toBeInTheDocument()
    expect(screen.getByText('Hábito')).toBeInTheDocument()
    expect(screen.getByText('Impacto medio: +2.0')).toBeInTheDocument()
    expect(screen.getByText('Actividad recuperadora · Confianza alta')).toBeInTheDocument()
    expect(screen.getByText('Tendencia: Mejorando')).toBeInTheDocument()
  })
})
