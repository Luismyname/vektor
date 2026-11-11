import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  useLowEnergyDay,
  useEnergyInsights,
  useRecommendations,
  useLearningPatterns,
  useEnergyImpacts,
} = vi.hoisted(() => ({
  useLowEnergyDay: vi.fn(),
  useEnergyInsights: vi.fn(),
  useRecommendations: vi.fn(),
  useLearningPatterns: vi.fn(),
  useEnergyImpacts: vi.fn(() => ({ summaries: [], loading: false, error: '', reload: vi.fn() })),
}))

vi.mock('../src/hooks/useLowEnergyDay', () => ({ useLowEnergyDay }))
vi.mock('../src/hooks/useEnergyInsights', () => ({ useEnergyInsights }))
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

const recommendation = {
  id: 'task-report',
  type: 'task',
  title: 'Preparar informe',
  reason: 'La tarea requiere mucha energía según tu historial.',
  confidence: 'high',
  priority: 100,
  recommendedWindow: { start: '08:00', end: '12:00' },
}
const action = {
  recommendationId: recommendation.id,
  taskId: 'task-1',
  suggestedDate: '2026-11-12',
  suggestedStartTime: '09:00',
  suggestedEndTime: '10:00',
  confidence: 'high',
  reason: recommendation.reason,
  plannerEntryId: 'entry-1',
  currentDate: '2026-11-11',
  currentStartTime: '15:00',
  currentEndTime: '16:00',
  durationMinutes: 60,
  windowStart: '08:00',
  windowEnd: '12:00',
}
const onApplyRecommendation = vi.fn().mockResolvedValue({ entry: { id: 'entry-1' }, error: null })

beforeEach(() => {
  useLowEnergyDay.mockReturnValue({
    isLowEnergy: false,
    reasons: [],
    loading: false,
    error: '',
    reload: vi.fn(),
  })
  useEnergyInsights.mockReturnValue({
    hourlyProfile: [],
    confidence: 'high',
    bestWindow: null,
    worstWindow: null,
    sampleCount: 0,
    loading: false,
    error: '',
  })
  useRecommendations.mockReturnValue({
    recommendations: [recommendation],
    actionByRecommendationId: {},
    unavailableReasonByRecommendationId: {},
    loading: false,
    error: '',
    reload: vi.fn(),
  })
  useLearningPatterns.mockReturnValue({ patterns: [], loading: false, error: '', reload: vi.fn() })
  useEnergyImpacts.mockReturnValue({ summaries: [], loading: false, error: '', reload: vi.fn() })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('VektorPanel recommendations', () => {
  it('shows a recommendation, evidence, confidence, time window, and only the allowed actions', () => {
    render(<VektorPanel {...panelProps} />)

    const section = screen.getByRole('region', { name: '⚡ Recomendaciones Vektor' })
    expect(within(section).getByRole('heading', { name: 'Preparar informe' })).toBeInTheDocument()
    expect(within(section).getByText(recommendation.reason)).toBeInTheDocument()
    expect(within(section).getByText('Confianza alta')).toBeInTheDocument()
    expect(within(section).getByText('Franja recomendada: 08:00 - 12:00')).toBeInTheDocument()
    expect(within(section).getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Entendido',
      'Ocultar',
    ])
    expect(within(section).queryByRole('button', { name: /aplicar|aceptar|mantener/i })).not.toBeInTheDocument()
  })

  it('dismisses only the acknowledged card without changing planner data', () => {
    const entries = [{ id: 'planner-entry', task_id: 'task-report' }]
    render(<VektorPanel {...panelProps} entries={entries} />)

    fireEvent.click(screen.getByRole('button', { name: 'Entendido' }))

    expect(screen.queryByRole('heading', { name: 'Preparar informe' })).not.toBeInTheDocument()
    expect(entries).toEqual([{ id: 'planner-entry', task_id: 'task-report' }])
    expect(useRecommendations.mock.results[0].value.reload).not.toHaveBeenCalled()
  })

  it('requires explicit confirmation before applying the proposed move', () => {
    useRecommendations.mockReturnValue({
      recommendations: [recommendation],
      actionByRecommendationId: { [recommendation.id]: action },
      unavailableReasonByRecommendationId: {},
      loading: false,
      error: '',
      reload: vi.fn(),
    })
    render(<VektorPanel {...panelProps} onApplyRecommendation={onApplyRecommendation} />)

    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Actual')).toBeInTheDocument()
    expect(within(dialog).getByText('15:00 - 16:00')).toBeInTheDocument()
    expect(within(dialog).getByText(/09:00 - 10:00/)).toBeInTheDocument()
    expect(onApplyRecommendation).not.toHaveBeenCalled()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar' }))

    expect(onApplyRecommendation).toHaveBeenCalledWith(action, false)
  })

  it('does not apply when the user cancels confirmation', () => {
    useRecommendations.mockReturnValue({
      recommendations: [recommendation],
      actionByRecommendationId: { [recommendation.id]: action },
      unavailableReasonByRecommendationId: {},
      loading: false,
      error: '',
      reload: vi.fn(),
    })
    render(<VektorPanel {...panelProps} onApplyRecommendation={onApplyRecommendation} />)

    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }))

    expect(onApplyRecommendation).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('keeps an occupied recommendation informational and explains why it cannot be applied', () => {
    useRecommendations.mockReturnValue({
      recommendations: [recommendation],
      actionByRecommendationId: { [recommendation.id]: null },
      unavailableReasonByRecommendationId: {
        [recommendation.id]: 'No se encontró un hueco libre por conflictos con obligaciones.',
      },
      loading: false,
      error: '',
      reload: vi.fn(),
    })
    render(<VektorPanel {...panelProps} onApplyRecommendation={onApplyRecommendation} />)

    expect(screen.getByText('No se encontró un hueco libre por conflictos con obligaciones.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Aplicar' })).not.toBeInTheDocument()
    expect(onApplyRecommendation).not.toHaveBeenCalled()
  })

  it('shows only persisted learning patterns with confidence at least 0.5', () => {
    useLearningPatterns.mockReturnValue({
      patterns: [
        {
          id: 'pattern-visible',
          pattern_type: 'time_preference',
          pattern_data: { key: 'time', summary: 'Completas más tareas entre 08:00 y 12:00.' },
          confidence: 0.8,
        },
        {
          id: 'pattern-hidden',
          pattern_type: 'friction_point',
          pattern_data: { key: 'weak', summary: 'Señal insuficiente.' },
          confidence: 0.49,
        },
      ],
      loading: false,
      error: '',
      reload: vi.fn(),
    })
    render(<VektorPanel {...panelProps} />)

    const section = screen.getByRole('region', { name: '🧠 Aprendizajes detectados' })
    expect(within(section).getByText('Completas más tareas entre 08:00 y 12:00.')).toBeInTheDocument()
    expect(within(section).getByText('Confianza: alta')).toBeInTheDocument()
    expect(within(section).queryByText('Señal insuficiente.')).not.toBeInTheDocument()
  })

  it('hides the recommendation section when requested', () => {
    render(<VektorPanel {...panelProps} />)

    fireEvent.click(screen.getByRole('button', { name: 'Ocultar' }))

    expect(screen.queryByRole('region', { name: '⚡ Recomendaciones Vektor' })).not.toBeInTheDocument()
  })

  it('explains that reliable recommendations need more data when confidence is low', () => {
    useEnergyInsights.mockReturnValue({
      hourlyProfile: [],
      confidence: 'low',
      bestWindow: null,
      worstWindow: null,
      sampleCount: 1,
      loading: false,
      error: '',
    })
    useRecommendations.mockReturnValue({ recommendations: [], loading: false, error: '', reload: vi.fn() })

    render(<VektorPanel {...panelProps} />)

    expect(screen.getByText('No hay suficientes datos todavía para generar recomendaciones fiables.')).toBeInTheDocument()
  })
})
