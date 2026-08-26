import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ActivityHistoryItem from '../src/app/activity/components/ActivityHistoryItem'

describe('ActivityHistoryItem', () => {
  it('muestra una actividad y permite abrir su detalle', async () => {
    const onClick = vi.fn()
    const activity = { id: 'activity-1', title: 'Estudiar React', type: 'completed', duration: 25, created_at: '2026-08-26T10:00:00.000Z' }
    render(<ul><ActivityHistoryItem activity={activity} onClick={onClick} /></ul>)

    expect(screen.getByText('Estudiar React')).toBeInTheDocument()
    expect(screen.getByText('Tarea finalizada')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledWith(activity)
  })
})