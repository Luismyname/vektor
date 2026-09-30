import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import TaskForm from '../src/app/tasks/components/TaskForm'

afterEach(() => {
  cleanup()
})

describe('TaskForm', () => {
  const defaultProps = {
    userId: 'user-123',
    dominantValue: 'Honestidad',
    onCreate: vi.fn(),
    onUpdate: vi.fn(),
    onCancel: vi.fn(),
    isSubmitting: false,
  }

  it('debe renderizar el formulario de creación', () => {
    render(<TaskForm {...defaultProps} />)

    expect(screen.getByText('Título')).toBeTruthy()
    expect(screen.getByText('Descripción')).toBeTruthy()
    expect(screen.getByText('Prioridad')).toBeTruthy()
    expect(screen.getByText('Valor relacionado')).toBeTruthy()
  })

  it('debe mostrar botón "Crear tarea" cuando no hay task', () => {
    render(<TaskForm {...defaultProps} />)

    expect(screen.getByText('Crear tarea')).toBeTruthy()
  })

  it('debe mostrar botón "Guardar cambios" cuando hay task', () => {
    const task = { id: 'task-1', title: 'Tarea existente', priority: 'high' }
    render(<TaskForm {...defaultProps} task={task} />)

    expect(screen.getByText('Guardar cambios')).toBeTruthy()
  })

  it('debe actualizar el título cuando el usuario escribe', () => {
    render(<TaskForm {...defaultProps} />)

    const titleInput = screen.getByPlaceholderText(/Ej\. Preparar la presentación/)
    fireEvent.change(titleInput, { target: { value: 'Nueva tarea' } })

    expect(titleInput.value).toBe('Nueva tarea')
  })

  it('debe actualizar la descripción cuando el usuario escribe', () => {
    render(<TaskForm {...defaultProps} />)

    const descInput = screen.getByPlaceholderText(/Añade contexto/)
    fireEvent.change(descInput, { target: { value: 'Descripción de prueba' } })

    expect(descInput.value).toBe('Descripción de prueba')
  })

  it('debe actualizar la prioridad cuando el usuario selecciona', () => {
    render(<TaskForm {...defaultProps} />)

    const prioritySelect = screen.getByDisplayValue('Media')
    fireEvent.change(prioritySelect, { target: { value: 'high' } })

    expect(prioritySelect.value).toBe('high')
  })

  it('debe llamar onCreate al enviar el formulario', () => {
    const onCreate = vi.fn()
    render(<TaskForm {...defaultProps} onCreate={onCreate} />)

    const titleInput = screen.getByPlaceholderText(/Ej\. Preparar la presentación/)
    fireEvent.change(titleInput, { target: { value: 'Tarea de prueba' } })
    fireEvent.click(screen.getByText('Crear tarea'))

    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Tarea de prueba',
        priority: 'medium',
      })
    )
  })

  it('debe llamar onUpdate al editar una tarea', () => {
    const onUpdate = vi.fn()
    const task = { id: 'task-1', title: 'Tarea existente', priority: 'high' }
    render(<TaskForm {...defaultProps} task={task} onUpdate={onUpdate} />)

    const titleInput = screen.getByDisplayValue('Tarea existente')
    fireEvent.change(titleInput, { target: { value: 'Tarea modificada' } })
    fireEvent.click(screen.getByText('Guardar cambios'))

    expect(onUpdate).toHaveBeenCalledWith(
      'task-1',
      expect.objectContaining({
        title: 'Tarea modificada',
      })
    )
  })

  it('debe llamar onCancel cuando se hace clic en Cancelar', () => {
    const onCancel = vi.fn()
    const task = { id: 'task-1', title: 'Tarea existente' }
    render(<TaskForm {...defaultProps} task={task} onCancel={onCancel} />)

    fireEvent.click(screen.getByText('Cancelar'))
    expect(onCancel).toHaveBeenCalled()
  })

  it('debe deshabilitar botones mientras se envía', () => {
    render(<TaskForm {...defaultProps} isSubmitting={true} />)

    expect(screen.getByText('Guardando...').disabled).toBe(true)
  })

  it('debe mostrar valor dominante como opción', () => {
    render(<TaskForm {...defaultProps} dominantValue="Honestidad" />)

    expect(screen.getByText('Usar valor dominante')).toBeTruthy()
  })
})
