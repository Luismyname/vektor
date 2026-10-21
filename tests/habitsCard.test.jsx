import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HabitsCard } from '../src/app/dashboard-v2/components/cards/HabitsCard'

afterEach(cleanup)

function renderCard(props = {}) {
  return render(
    <MemoryRouter>
      <HabitsCard {...props} />
    </MemoryRouter>,
  )
}

describe('HabitsCard', () => {
  it('muestra solo las ocurrencias recibidas y no marca antes de confirmar', async () => {
    let resolveCompletion
    const onComplete = vi.fn(() => new Promise(resolve => {
      resolveCompletion = resolve
    }))
    const entry = {
      id: 'planner-entry-1',
      habit_id: 'habit-1',
      date: '2026-10-21',
      status: 'scheduled',
    }
    const { container, rerender } = renderCard({
      entries: [entry],
      habitDefinitions: [{ id: 'habit-1', title: 'Leer' }],
      onComplete,
    })

    const completeButton = screen.getByRole('button', { name: 'Completar Leer' })
    fireEvent.click(completeButton)
    fireEvent.click(completeButton)

    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onComplete).toHaveBeenCalledWith('planner-entry-1')
    expect(completeButton).toBeDisabled()
    expect(container.querySelector('.habit-item')).not.toHaveClass('completed')
    expect(completeButton).toHaveAttribute('aria-pressed', 'false')

    resolveCompletion({ entry: { ...entry, status: 'completed' }, error: null })
    await waitFor(() => expect(completeButton).toBeEnabled())
    expect(container.querySelector('.habit-item')).not.toHaveClass('completed')

    rerender(
      <MemoryRouter>
        <HabitsCard
          entries={[{ ...entry, status: 'completed' }]}
          habitDefinitions={[{ id: 'habit-1', title: 'Leer' }]}
          onComplete={onComplete}
        />
      </MemoryRouter>,
    )

    expect(screen.getByRole('button', { name: 'Leer completado' })).toBeDisabled()
    expect(container.querySelector('.habit-item')).toHaveClass('completed')
  })

  it('muestra el estado vacío y permite abrir el planificador', () => {
    renderCard({ entries: [], onComplete: vi.fn() })

    expect(screen.getByText('No tienes hábitos programados para hoy.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ir al planificador' })).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('identifica una definición no disponible como hábito eliminado', () => {
    renderCard({
      entries: [{ id: 'planner-entry-2', habit_id: 'deleted-habit', status: 'scheduled' }],
      habitDefinitions: [],
      onComplete: vi.fn(),
    })

    expect(screen.getByText('Hábito eliminado')).toBeInTheDocument()
  })

  it('mantiene bloqueada una ocurrencia ya completada', () => {
    const onComplete = vi.fn()
    renderCard({
      entries: [{ id: 'planner-entry-3', habit_id: 'habit-1', status: 'completed' }],
      habitDefinitions: [{ id: 'habit-1', title: 'Meditar' }],
      onComplete,
    })

    const completeButton = screen.getByRole('button', { name: 'Meditar completado' })
    expect(completeButton).toBeDisabled()
    fireEvent.click(completeButton)
    expect(onComplete).not.toHaveBeenCalled()
  })
})
