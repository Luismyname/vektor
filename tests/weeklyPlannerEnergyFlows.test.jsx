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
} = vi.hoisted(() => ({
  saveEnergyAtHabitCompletion: vi.fn(async () => ({ error: null })),
  saveEnergyAtMoment: vi.fn(async () => ({ error: null })),
  saveEnergyAtTaskEnd: vi.fn(async () => ({ error: null })),
  saveEnergyAtTaskStart: vi.fn(async () => ({ error: null })),
}))

vi.mock('../src/services/energy', () => ({
  saveEnergyAtHabitCompletion,
  saveEnergyAtMoment,
  saveEnergyAtTaskEnd,
  saveEnergyAtTaskStart,
}))

import TaskBlock from '../src/components/weekly-planner/TaskBlock'
import HabitBlock from '../src/components/weekly-planner/HabitBlock'
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
  fireEvent.change(screen.getByRole('slider', { name: 'Nivel de energía' }), {
    target: { value: String(value) },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
}

describe('planner energy check-ins', () => {
  it('opens the existing popover from a task start trigger and saves task-start energy', async () => {
    renderWithProviders(<TaskBlock {...taskBlockProps()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Registrar energía inicial' }))

    expect(screen.getByRole('dialog', { name: 'Seleccionar Energía inicial' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Preparar informe' })).not.toBeInTheDocument()
    await saveEnergy()

    await waitFor(() => expect(saveEnergyAtTaskStart).toHaveBeenCalledWith('user-1', 7))
  })

  it('opens the existing popover from a habit start trigger and saves a check-in', async () => {
    renderWithProviders(<HabitBlock {...habitBlockProps()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Registrar energía inicial' }))
    await saveEnergy()

    await waitFor(() => expect(saveEnergyAtMoment).toHaveBeenCalledWith('user-1', 7, 'checkin'))
  })

  it.each(['task', 'habit'])('does not start drag from the %s energy trigger', (itemType) => {
    const onDragStart = vi.fn()
    const element = itemType === 'task'
      ? <TaskBlock {...taskBlockProps({ onDragStart })} />
      : <HabitBlock {...habitBlockProps({ onDragStart })} />
    const blockLabel = itemType === 'task' ? 'Abrir tarea Preparar informe' : 'Abrir hábito Meditar'
    renderWithProviders(element)

    fireEvent.dragStart(screen.getByRole('button', { name: 'Registrar energía inicial' }))
    expect(onDragStart).not.toHaveBeenCalled()

    fireEvent.dragStart(screen.getByRole('button', { name: blockLabel }))
    expect(onDragStart).toHaveBeenCalledOnce()
  })

  it.each(['completed', 'failed', 'moved'])(
    'opens the task end check-in when its status changes to %s',
    async (status) => {
      const onStatusChange = vi.fn()
      renderWithProviders(<TaskBlock {...taskBlockProps({ onStatusChange })} />)

      fireEvent.click(screen.getByRole('button', { name: 'Abrir tarea Preparar informe' }))
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

      fireEvent.click(screen.getByRole('button', { name: 'Abrir hábito Meditar' }))
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
