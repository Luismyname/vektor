import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import WeeklyTimeSlotModal from '../src/components/weekly-planner/WeeklyTimeSlotModal'

describe('WeeklyTimeSlotModal obligations tab', () => {
  it('offers four tabs and creates an overnight weekly sleep obligation', () => {
    const onSubmit = vi.fn()
    render(
      <WeeklyTimeSlotModal
        isOpen
        onClose={vi.fn()}
        onSubmit={onSubmit}
        tasks={[]}
        habits={[]}
        date="2026-11-09"
        startTime="23:00"
        endTime="23:59"
      />,
    )

    expect(screen.getAllByRole('tab')).toHaveLength(4)
    fireEvent.click(screen.getByRole('tab', { name: 'Obligaciones' }))
    fireEvent.change(screen.getByLabelText('Nombre de la obligación'), { target: { value: 'Sueño' } })
    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'sleep' } })
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '23:00' } })
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '07:00' } })
    fireEvent.change(screen.getByLabelText('Repetición'), { target: { value: 'weekly' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crear obligación' }))

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      type: 'obligation',
      title: 'Sueño',
      obligationType: 'sleep',
      startTime: '23:00',
      endTime: '07:00',
      recurrence: 'weekly',
      byDay: [1],
      date: '2026-11-09',
    }))
  })
})
