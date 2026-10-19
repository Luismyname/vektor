import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import HourSlot from '../src/components/weekly-planner/HourSlot'
import WeeklyGrid from '../src/components/weekly-planner/WeeklyGrid'

const dates = [
  '2026-10-19',
  '2026-10-20',
  '2026-10-21',
  '2026-10-22',
  '2026-10-23',
  '2026-10-24',
  '2026-10-25',
]

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function renderGrid(energyByDayHour = {}) {
  return render(
    <WeeklyGrid
      dates={dates}
      currentTime={new Date('2026-10-19T08:00:00')}
      today={dates[0]}
      entries={[]}
      taskById={{}}
      habitById={{}}
      focusSessions={[]}
      energyByDayHour={energyByDayHour}
      onDropTask={vi.fn()}
      onDragStart={vi.fn()}
      onStatusChange={vi.fn()}
      onDurationChange={vi.fn()}
      onAutoReschedule={vi.fn()}
      onDelete={vi.fn()}
      onTaskUpdate={vi.fn()}
      onClearDay={vi.fn()}
      onClickSlot={vi.fn()}
    />,
  )
}

describe('WeeklyGrid', () => {
  it('renders a full 24-hour day for each of the seven columns', () => {
    const { container } = renderGrid()

    expect([...container.querySelectorAll('.weekly-time-axis span')].map((span) => span.textContent))
      .toEqual(Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, '0')}:00`))
    expect(container.querySelectorAll('.weekly-hour-slot')).toHaveLength(24 * 7)
  })

  it('shows daily energy percentages in the day headings', () => {
    const { container } = renderGrid({
      [dates[0]]: { 9: 7 },
      [dates[1]]: { 10: 5 },
      [dates[2]]: { 12: 8.5 },
    })

    const energyLabels = [...container.querySelectorAll('.weekly-day-energy > span:last-child')]
      .map((label) => label.textContent)
    expect(energyLabels).toEqual(['70%', '50%', '85%', '—', '—', '—', '—'])
  })

  it('starts the internal calendar scroll at the current hour', () => {
    vi.stubGlobal('requestAnimationFrame', (callback) => {
      callback()
      return 1
    })

    const { container } = renderGrid()

    expect(container.querySelector('.weekly-grid-wrap').scrollTop).toBe(7 * 70)
  })
})

describe('HourSlot', () => {
  it('moves an existing fixed event in the final 23:00 slot', () => {
    const onDropTask = vi.fn()
    const { getByRole } = render(
      <HourSlot date={dates[0]} hour={23} onDropTask={onDropTask} onClick={vi.fn()} />,
    )
    const slot = getByRole('button', { name: `${dates[0]} a las 23:00` })

    fireEvent.drop(slot, {
      dataTransfer: {
        getData: (type) => type === 'text/planner-entry' ? 'fixed-event-1' : '',
      },
    })

    expect(onDropTask).toHaveBeenCalledWith('', 'fixed-event-1', 'habit', dates[0], '23:00', '23:59')
  })
})
