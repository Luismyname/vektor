import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import PlannerConflictNotice from '../src/app/weekly-planner/components/PlannerConflictNotice'

afterEach(cleanup)

function makeConflict(overrides = {}) {
  return {
    id: 'conflict-1',
    source_entry_id: 'obligation-entry',
    conflicting_entry_id: 'affected-entry',
    source_title: 'Trabajo',
    source_type: 'Obligación',
    conflicting_title: 'Recordatorio',
    conflicting_type: 'Recordatorio',
    status: 'manual',
    detected_at: '2026-11-12T10:00:00Z',
    grace_until: null,
    resolution_message: null,
    ...overrides,
  }
}

function renderNotice(conflict) {
  return render(
    <PlannerConflictNotice
      conflicts={[conflict]}
      entries={[]}
      taskById={{}}
      habitById={{}}
      error=""
      busyId=""
      onResolve={vi.fn()}
      onDismiss={vi.fn()}
    />,
  )
}

describe('planner conflict notice', () => {
  it('states that a fixed reminder requires manual resolution and has no automatic deadline', () => {
    renderNotice(makeConflict())

    expect(screen.getByRole('status')).toHaveTextContent('requiere una resolución manual')
    expect(screen.getByRole('status')).toHaveTextContent('nunca se modifican automáticamente')
    expect(screen.queryByRole('button', { name: 'Reorganizar automáticamente' })).not.toBeInTheDocument()
  })

  it('shows the 30-minute grace period for a conflict awaiting manual resolution', () => {
    renderNotice(makeConflict({ grace_until: '2026-11-12T10:30:00Z' }))

    expect(screen.getByRole('status')).toHaveTextContent('después de 30 minutos')
  })
})
