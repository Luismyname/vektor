import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { AuthContext } from '../src/context/AuthContext'
import { EnergyPopoverProvider } from '../src/context/EnergyPopoverContext'

const {
  saveEnergyAtHabitCompletion,
  saveEnergyAtMoment,
  saveEnergyAtTaskEnd,
  saveEnergyAtTaskStart,
  recordHabitImpact,
  recordObligationImpact,
  recordTaskImpact,
} = vi.hoisted(() => ({
  saveEnergyAtHabitCompletion: vi.fn(async () => ({ error: null })),
  saveEnergyAtMoment: vi.fn(async () => ({ error: null })),
  saveEnergyAtTaskEnd: vi.fn(async () => ({ error: null })),
  saveEnergyAtTaskStart: vi.fn(async () => ({ error: null })),
  recordTaskImpact: vi.fn(async () => ({ data: { id: 'impact-1' }, error: null })),
  recordHabitImpact: vi.fn(async () => ({ data: { id: 'impact-1' }, error: null })),
  recordObligationImpact: vi.fn(async () => ({ data: { id: 'impact-1' }, error: null })),
}))

vi.mock('../src/services/energy', () => ({
  saveEnergyAtHabitCompletion,
  saveEnergyAtMoment,
  saveEnergyAtTaskEnd,
  saveEnergyAtTaskStart,
}))
vi.mock('../src/services/energy-impact-engine', () => ({
  recordHabitImpact,
  recordObligationImpact,
  recordTaskImpact,
}))

import TaskBlock from '../src/components/weekly-planner/TaskBlock'
import HabitBlock from '../src/components/weekly-planner/HabitBlock'
import ObligationBlock from '../src/components/weekly-planner/ObligationBlock'
import PlannerIncompleteSection from '../src/app/weekly-planner/components/PlannerIncompleteSection'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const entry = { id: 'entry-1', start_time: '09:00:00', end_time: '09:30:00', status: 'scheduled' }
const task = { id: 'task-1', title: 'Preparar informe', priority: 'medium' }
const habit = { id: 'habit-1', title: 'Meditar', active: true }

function renderWithProviders(element, { router = false } = {}) {
  const content = router ? <BrowserRouter>{element}</BrowserRouter> : element
  return render(
    <AuthContext.Provider value={{ user: { id: 'user-1' } }}>
      <EnergyPopoverProvider>{content}</EnergyPopoverProvider>
    </AuthContext.Provider>,
  )
}

function taskBlockProps(overrides = {}) {
  return {
    entry,
    task,
    onStatusChange: vi.fn(),
    onDragStart: vi.fn(),
    onAutoReschedule: vi.fn(),
    onDurationChange: vi.fn(),
    onDelete: vi.fn(),
    onTaskUpdate: vi.fn(),
    onStartTask: vi.fn(),
    userId: 'user-1',
    ...overrides,
  }
}

function habitBlockProps(overrides = {}) {
  return {
    entry,
    habit,
    onStatusChange: vi.fn(),
    onDragStart: vi.fn(),
    onDurationChange: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  }
}

async function saveEnergy(value = 7) {
  fireEvent.click(screen.getByRole('radio', { name: `Energía ${value} de 10` }))
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
}

describe('planner energy check-ins', () => {
  it('opens the task action menu and saves task-start energy through its energy action', async () => {
    renderWithProviders(<TaskBlock {...taskBlockProps()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Acciones de tarea Preparar informe' }))
    fireEvent.click(screen.getByRole('menuitem', { name: '⚡ Registrar energía' }))

    expect(screen.getByRole('dialog', { name: 'Seleccionar Energía inicial' })).toBeInTheDocument()
    await saveEnergy()

    await waitFor(() => expect(saveEnergyAtTaskStart).toHaveBeenCalledWith('user-1', 7))
  })

  it('opens the habit action menu and records habit_start energy', async () => {
    renderWithProviders(<HabitBlock {...habitBlockProps()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Acciones de hábito Meditar' }))
    fireEvent.click(screen.getByRole('menuitem', { name: '⚡ Registrar energía' }))
    await saveEnergy()

    await waitFor(() => {
      expect(saveEnergyAtMoment).toHaveBeenCalledWith('user-1', 7, 'habit_start')
      expect(recordHabitImpact).toHaveBeenCalledWith('user-1', 'habit-1', 'start', 7)
    })
  })

  it('pairs task start and completion captures into one impact record', async () => {
    renderWithProviders(<TaskBlock {...taskBlockProps()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Acciones de tarea Preparar informe' }))
    fireEvent.click(screen.getByRole('menuitem', { name: '⚡ Registrar energía' }))
    await saveEnergy(8)
    await waitFor(() => expect(recordTaskImpact).toHaveBeenCalledWith('user-1', 'task-1', 'start', 8))

    fireEvent.click(screen.getByRole('button', { name: 'Acciones de tarea Preparar informe' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Editar' }))
    fireEvent.change(screen.getByLabelText('Estado de Preparar informe'), { target: { value: 'completed' } })
    await saveEnergy(4)

    await waitFor(() => expect(recordTaskImpact).toHaveBeenLastCalledWith(
      'user-1',
      'task-1',
      'finish',
      4,
      'impact-1',
    ))

  })

  it('records habit_completion against the captured habit_start energy', async () => {
    renderWithProviders(<HabitBlock {...habitBlockProps()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Acciones de hábito Meditar' }))
    fireEvent.click(screen.getByRole('menuitem', { name: '⚡ Registrar energía' }))
    await saveEnergy(8)
    await waitFor(() => expect(recordHabitImpact).toHaveBeenCalledWith(
      'user-1',
      'habit-1',
      'start',
      8,
    ))

    fireEvent.click(screen.getByRole('button', { name: 'Acciones de hábito Meditar' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Editar' }))
    fireEvent.change(screen.getByLabelText('Estado de Meditar'), { target: { value: 'completed' } })
    await saveEnergy(6)

    await waitFor(() => expect(recordHabitImpact).toHaveBeenLastCalledWith(
      'user-1',
      'habit-1',
      'finish',
      6,
      'impact-1',
    ))
  })

  it('records before and after energy for obligation occurrences', async () => {
    const obligationEntry = {
      id: 'planner-obligation-1',
      date: '2026-11-11',
      start_time: '09:00:00',
      end_time: '10:00:00',
      task_id: null,
      habit_id: null,
      status: 'scheduled',
      obligation_id: 'obligation-1',
      obligation_occurrence_date: '2026-11-11',
      obligation: { id: 'obligation-1', title: 'Trabajo', obligation_type: 'work' },
    }
    const segment = {
      date: '2026-11-11',
      segment: 'single',
      label: '09:00 - 10:00',
      startMinutes: 540,
      endMinutes: 600,
    }
    const onStatusChange = vi.fn()
    const onDelete = vi.fn()
    renderWithProviders(
      <ObligationBlock
        entry={obligationEntry}
        segment={segment}
        onDragStart={vi.fn()}
        onStatusChange={onStatusChange}
        onDelete={onDelete}
        onDurationChange={vi.fn()}
        onOccurrenceUpdate={vi.fn()}
        onObligationUpdate={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Acciones de obligación Trabajo/ }))
    fireEvent.click(screen.getByRole('menuitem', { name: '⚡ Registrar energía' }))
    await saveEnergy(7)
    await waitFor(() => expect(recordObligationImpact).toHaveBeenCalledWith(
      'user-1',
      'obligation-1',
      'start',
      7,
      undefined,
    ))

    fireEvent.click(screen.getByRole('button', { name: /Acciones de obligación Trabajo/ }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Editar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Registrar energía final' }))
    await saveEnergy(5)

    await waitFor(() => expect(recordObligationImpact).toHaveBeenLastCalledWith(
      'user-1',
      'obligation-1',
      'finish',
      5,
      'impact-1',
    ))

    fireEvent.click(screen.getByRole('button', { name: /Acciones de obligación Trabajo/ }))
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
      'Marcar como completada',
      '⚡ Registrar energía',
      'Editar',
      'Eliminar',
    ])
    fireEvent.click(screen.getByRole('menuitem', { name: 'Marcar como completada' }))
    expect(onStatusChange).toHaveBeenCalledWith(obligationEntry, 'completed')

    fireEvent.click(screen.getByRole('button', { name: /Acciones de obligación Trabajo/ }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Eliminar' }))
    expect(onDelete).toHaveBeenCalledWith(obligationEntry.id)
  })

  it.each(['task', 'habit'])('opens %s actions on click while keeping drag on the activity block', (itemType) => {
    const onDragStart = vi.fn()
    const element = itemType === 'task'
      ? <TaskBlock {...taskBlockProps({ onDragStart })} />
      : <HabitBlock {...habitBlockProps({ onDragStart })} />
    const blockLabel = itemType === 'task'
      ? 'Acciones de tarea Preparar informe'
      : 'Acciones de hábito Meditar'
    renderWithProviders(element)

    fireEvent.click(screen.getByRole('button', { name: blockLabel }))
    expect(screen.getByRole('menu', { name: /Acciones para/ })).toBeInTheDocument()
    fireEvent.dragStart(screen.getByRole('menuitem', { name: '⚡ Registrar energía' }))
    expect(onDragStart).not.toHaveBeenCalled()

    fireEvent.dragStart(screen.getByRole('button', { name: blockLabel }))
    expect(onDragStart).toHaveBeenCalledOnce()
  })

  it('shows the five contextual task actions and reuses focus start and existing deletion handlers', () => {
    const onStatusChange = vi.fn()
    const onDelete = vi.fn()
    const onStartTask = vi.fn()
    renderWithProviders(<TaskBlock {...taskBlockProps({ onStatusChange, onDelete, onStartTask })} />)

    fireEvent.click(screen.getByRole('button', { name: 'Acciones de tarea Preparar informe' }))
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
      'Marcar como en curso',
      'Marcar como completada',
      '⚡ Registrar energía',
      'Editar',
      'Eliminar',
    ])
    fireEvent.click(screen.getByRole('menuitem', { name: 'Marcar como en curso' }))
    expect(onStartTask).toHaveBeenCalledWith(entry, task)
    expect(onStatusChange).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Acciones de tarea Preparar informe' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Eliminar' }))
    expect(onDelete).toHaveBeenCalledWith(entry.id)
  })

  it('shows only habit actions and completes through its existing status handler', () => {
    const onStatusChange = vi.fn()
    renderWithProviders(<HabitBlock {...habitBlockProps({ onStatusChange })} />)

    fireEvent.click(screen.getByRole('button', { name: 'Acciones de hábito Meditar' }))
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
      'Marcar como completado',
      '⚡ Registrar energía',
      'Editar',
      'Eliminar',
    ])
    fireEvent.click(screen.getByRole('menuitem', { name: 'Marcar como completado' }))

    expect(onStatusChange).toHaveBeenCalledWith(entry, 'completed')
    expect(screen.getByRole('dialog', { name: 'Seleccionar Energía al finalizar' })).toBeInTheDocument()
  })

  it.each(['completed', 'failed', 'moved'])(
    'opens the task end check-in when its status changes to %s',
    async (status) => {
      const onStatusChange = vi.fn()
      renderWithProviders(<TaskBlock {...taskBlockProps({ onStatusChange })} />)

      fireEvent.click(screen.getByRole('button', { name: 'Acciones de tarea Preparar informe' }))
      fireEvent.click(screen.getByRole('menuitem', { name: 'Editar' }))
      fireEvent.change(screen.getByLabelText('Estado de Preparar informe'), { target: { value: status } })

      expect(onStatusChange).toHaveBeenCalledWith(entry, status)
      expect(screen.getByRole('dialog', { name: 'Seleccionar Energía al finalizar' })).toBeInTheDocument()
      await saveEnergy()

      await waitFor(() => expect(saveEnergyAtTaskEnd).toHaveBeenCalledWith('user-1', 7))
    },
  )

  it.each(['completed', 'failed', 'moved'])(
    'opens the habit end check-in when its status changes to %s',
    async (status) => {
      const onStatusChange = vi.fn()
      renderWithProviders(<HabitBlock {...habitBlockProps({ onStatusChange })} />)

      fireEvent.click(screen.getByRole('button', { name: 'Acciones de hábito Meditar' }))
      fireEvent.click(screen.getByRole('menuitem', { name: 'Editar' }))
      fireEvent.change(screen.getByLabelText('Estado de Meditar'), { target: { value: status } })

      expect(onStatusChange).toHaveBeenCalledWith(entry, status)
      expect(screen.getByRole('dialog', { name: 'Seleccionar Energía al finalizar' })).toBeInTheDocument()
      await saveEnergy()

      await waitFor(() => expect(saveEnergyAtHabitCompletion).toHaveBeenCalledWith('user-1', 7))
    },
  )

  it.each([
    ['task', 'completed', 'Finalizada', saveEnergyAtTaskEnd],
    ['task', 'failed', 'No finalizada', saveEnergyAtTaskEnd],
    ['habit', 'completed', 'Finalizada', saveEnergyAtHabitCompletion],
    ['habit', 'failed', 'No finalizada', saveEnergyAtHabitCompletion],
  ])('opens a final energy check-in for an incomplete %s marked %s', async (itemType, status, label, saveEnergyService) => {
    const item = itemType === 'task' ? task : habit
    const onStatusChange = vi.fn()
    const incompleteEntry = {
      ...entry,
      task_id: itemType === 'task' ? item.id : null,
      habit_id: itemType === 'habit' ? item.id : null,
    }

    renderWithProviders(
      <PlannerIncompleteSection
        itemType={itemType}
        entries={[incompleteEntry]}
        items={[item]}
        onStatusChange={onStatusChange}
        updatingEntryId={null}
        userId="user-1"
      />,
      { router: true },
    )

    fireEvent.click(screen.getByRole('button', { name: label }))

    expect(onStatusChange).toHaveBeenCalledWith(
      expect.objectContaining({ ...incompleteEntry, title: item.title }),
      itemType,
      status,
    )
    expect(screen.getByRole('dialog', { name: 'Seleccionar Energía al finalizar' })).toBeInTheDocument()
    await saveEnergy()

    await waitFor(() => expect(saveEnergyService).toHaveBeenCalledWith('user-1', 7))
  })
})
