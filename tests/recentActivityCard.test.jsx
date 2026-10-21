import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RecentActivityCard } from '../src/app/dashboard-v2/components/cards/RecentActivityCard'

afterEach(cleanup)

function renderCard(props) {
  return render(
    <MemoryRouter>
      <RecentActivityCard {...props} />
    </MemoryRouter>,
  )
}

describe('RecentActivityCard progreso reciente', () => {
  it('muestra únicamente actividades completadas con fecha y duración opcional', () => {
    renderCard({
      activities: [
        {
          id: 'completed-1',
          type: 'completed',
          title: 'Leroy',
          created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
          duration: 45,
        },
        {
          id: 'pending-1',
          type: 'pending',
          title: 'Actividad pendiente',
          created_at: new Date().toISOString(),
        },
        {
          id: 'in-progress-1',
          type: 'in_progress',
          title: 'Actividad en curso',
          created_at: new Date().toISOString(),
        },
        {
          id: 'completed-2',
          type: 'completed',
          title: 'Revisar progreso semanal',
          created_at: new Date(Date.now() - 86400000).toISOString(),
        },
      ],
      onHideActivity: vi.fn(),
    })

    expect(screen.getByText('Progreso reciente')).toBeInTheDocument()
    expect(screen.getByText('Leroy')).toBeInTheDocument()
    expect(screen.getByText('Completada hace 2 días')).toBeInTheDocument()
    expect(screen.getByText('45 min')).toBeInTheDocument()
    expect(screen.getByText('Revisar progreso semanal')).toBeInTheDocument()
    expect(screen.queryByText('Actividad pendiente')).not.toBeInTheDocument()
    expect(screen.queryByText('Actividad en curso')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ver toda la actividad' })).toBeInTheDocument()
  })

  it('muestra estado vacío y el acceso a actividad cuando no hay logros', () => {
    renderCard({ activities: [], onHideActivity: vi.fn() })

    expect(screen.getByText('Aún no hay avances registrados.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ir a actividad' })).toBeInTheDocument()
  })

  it('solicita ocultación y muestra el error cuando falla', async () => {
    const onHideActivity = vi.fn().mockResolvedValue({ error: new Error('No se pudo guardar') })
    renderCard({
      activities: [{
        id: 'completed-1',
        type: 'completed',
        title: 'Leroy',
        created_at: new Date().toISOString(),
      }],
      onHideActivity,
    })

    fireEvent.click(screen.getByRole('button', { name: 'Ocultar Leroy del dashboard' }))

    expect(onHideActivity).toHaveBeenCalledWith('completed-1')
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo guardar')
    expect(screen.getByText('Leroy')).toBeInTheDocument()
  })

  it('mantiene visible la actividad hasta confirmarse la ocultación', async () => {
    let resolveHide
    const onHideActivity = vi.fn(() => new Promise(resolve => {
      resolveHide = resolve
    }))
    const props = {
      activities: [{
        id: 'completed-1',
        type: 'completed',
        title: 'Leroy',
        created_at: new Date().toISOString(),
      }],
      onHideActivity,
    }
    const { rerender } = renderCard(props)

    fireEvent.click(screen.getByRole('button', { name: 'Ocultar Leroy del dashboard' }))
    expect(screen.getByText('Leroy')).toBeInTheDocument()

    await act(async () => {
      resolveHide({ error: null })
    })
    rerender(
      <MemoryRouter>
        <RecentActivityCard {...props} activities={[]} />
      </MemoryRouter>,
    )
    expect(screen.queryByText('Leroy')).not.toBeInTheDocument()
    expect(screen.getByText('Aún no hay avances registrados.')).toBeInTheDocument()
  })
})
