import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import CreateTaskForm from '../src/components/weekly-planner/forms/CreateTaskForm'
import ExistingHabitSelector from '../src/components/weekly-planner/forms/ExistingHabitSelector'
import ExistingTaskSelector from '../src/components/weekly-planner/forms/ExistingTaskSelector'

afterEach(cleanup)

describe('planificación de tareas', () => {
  it('excluye tareas ya planificadas y completadas', () => {
    render(
      <ExistingTaskSelector
        tasks={[
          { id: 'planned', title: 'Ya planificada', status: 'pending' },
          { id: 'completed', title: 'Completada', status: 'completed' },
          { id: 'pending', title: 'Pendiente', status: 'pending' },
        ]}
        plannedTaskIds={new Set(['planned'])}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(screen.queryByText('Ya planificada')).not.toBeInTheDocument()
    expect(screen.queryByText('Completada')).not.toBeInTheDocument()
    expect(screen.getByText('Pendiente')).toBeInTheDocument()
  })

  it('muestra únicamente hábitos cuyo active es true', () => {
    render(
      <ExistingHabitSelector
        habits={[
          { id: 'active', title: 'Activo', active: true },
          { id: 'inactive', title: 'Inactivo', active: false },
          { id: 'missing', title: 'Sin indicador' },
        ]}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByText('Activo')).toBeInTheDocument()
    expect(screen.queryByText('Inactivo')).not.toBeInTheDocument()
    expect(screen.queryByText('Sin indicador')).not.toBeInTheDocument()
  })

  it.each([
    ['12:30', '30 minutos'],
    ['13:30', '90 minutos'],
    ['14:00', '120 minutos'],
  ])('calcula la duración en minutos cuando la hora de fin es %s', (endTime, expectedDuration) => {
    const onSubmit = vi.fn()
    render(
      <CreateTaskForm
        onSubmit={onSubmit}
        onCancel={vi.fn()}
        initialStartTime="12:00"
        initialDuration={30}
      />,
    )

    fireEvent.change(screen.getByLabelText('Título *'), { target: { value: 'Preparar propuesta' } })
    fireEvent.change(screen.getByLabelText('Hora de fin'), { target: { value: endTime } })

    expect(screen.getByText(`Duración estimada: ${expectedDuration}`)).toBeInTheDocument()
    fireEvent.submit(screen.getByRole('button', { name: 'Crear tarea y agendar' }).closest('form'))

    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Preparar propuesta',
      description: '',
      priority: 'medium',
      startTime: '12:00',
      endTime,
    })
  })

  it('rechaza una hora de fin igual a la de inicio', () => {
    render(<CreateTaskForm onSubmit={vi.fn()} onCancel={vi.fn()} initialStartTime="12:00" />)

    fireEvent.change(screen.getByLabelText('Hora de fin'), { target: { value: '12:00' } })

    expect(screen.getByRole('alert')).toHaveTextContent('La hora de fin debe ser posterior a la hora de inicio.')
    expect(screen.getByRole('button', { name: 'Crear tarea y agendar' })).toBeDisabled()
  })

  it('rechaza intervalos que cruzan medianoche', () => {
    render(<CreateTaskForm onSubmit={vi.fn()} onCancel={vi.fn()} initialStartTime="23:00" />)

    fireEvent.change(screen.getByLabelText('Hora de fin'), { target: { value: '01:00' } })

    expect(screen.getByRole('alert')).toHaveTextContent('Las tareas deben finalizar dentro del mismo día.')
    expect(screen.getByRole('button', { name: 'Crear tarea y agendar' })).toBeDisabled()
  })
})
