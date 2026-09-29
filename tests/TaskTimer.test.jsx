import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import TaskTimer from '../src/app/dashboard/components/TaskTimer'

afterEach(() => {
  cleanup()
})

describe('TaskTimer', () => {
  it('debe mostrar mensaje cuando no hay tarea activa', () => {
    render(
      <TaskTimer
        task={null}
        durationMinutes={25}
        remainingSeconds={1500}
        isRunning={false}
        onClick={() => {}}
        onPause={() => {}}
        onResume={() => {}}
        onStop={() => {}}
      />
    )

    expect(screen.getByText('No hay ninguna tarea activa en este momento.')).toBeTruthy()
  })

  it('debe mostrar el título de la tarea activa', () => {
    const mockTask = { id: '1', title: 'Estudiar React', priority: 'high' }

    render(
      <TaskTimer
        task={mockTask}
        durationMinutes={25}
        remainingSeconds={1500}
        isRunning={true}
        onClick={() => {}}
        onPause={() => {}}
        onResume={() => {}}
        onStop={() => {}}
      />
    )

    expect(screen.getByText('Estudiar React')).toBeTruthy()
  })

  it('debe mostrar el tiempo formateado correctamente', () => {
    const mockTask = { id: '1', title: 'Tarea de prueba', priority: 'medium' }

    render(
      <TaskTimer
        task={mockTask}
        durationMinutes={25}
        remainingSeconds={1500}
        isRunning={true}
        onClick={() => {}}
        onPause={() => {}}
        onResume={() => {}}
        onStop={() => {}}
      />
    )

    // 1500 segundos = 25:00
    expect(screen.getByText('25:00')).toBeTruthy()
  })

  it('debe mostrar "Pausar" cuando el timer está corriendo', () => {
    const mockTask = { id: '1', title: 'Tarea', priority: 'medium' }

    render(
      <TaskTimer
        task={mockTask}
        durationMinutes={25}
        remainingSeconds={1500}
        isRunning={true}
        onClick={() => {}}
        onPause={() => {}}
        onResume={() => {}}
        onStop={() => {}}
      />
    )

    expect(screen.getByText('Pausar')).toBeTruthy()
  })

  it('debe mostrar "Reanudar" cuando el timer está pausado', () => {
    const mockTask = { id: '1', title: 'Tarea', priority: 'medium' }

    render(
      <TaskTimer
        task={mockTask}
        durationMinutes={25}
        remainingSeconds={1500}
        isRunning={false}
        onClick={() => {}}
        onPause={() => {}}
        onResume={() => {}}
        onStop={() => {}}
      />
    )

    expect(screen.getByText('Reanudar')).toBeTruthy()
  })

  it('debe llamar onPause cuando se hace clic en Pausar', () => {
    const mockTask = { id: '1', title: 'Tarea', priority: 'medium' }
    const onPause = vi.fn()

    render(
      <TaskTimer
        task={mockTask}
        durationMinutes={25}
        remainingSeconds={1500}
        isRunning={true}
        onClick={() => {}}
        onPause={onPause}
        onResume={() => {}}
        onStop={() => {}}
      />
    )

    fireEvent.click(screen.getByText('Pausar'))
    expect(onPause).toHaveBeenCalledTimes(1)
  })

  it('debe llamar onResume cuando se hace clic en Reanudar', () => {
    const mockTask = { id: '1', title: 'Tarea', priority: 'medium' }
    const onResume = vi.fn()

    render(
      <TaskTimer
        task={mockTask}
        durationMinutes={25}
        remainingSeconds={1500}
        isRunning={false}
        onClick={() => {}}
        onPause={() => {}}
        onResume={onResume}
        onStop={() => {}}
      />
    )

    fireEvent.click(screen.getByText('Reanudar'))
    expect(onResume).toHaveBeenCalledTimes(1)
  })

  it('debe llamar onStop cuando se hace clic en Stop', () => {
    const mockTask = { id: '1', title: 'Tarea', priority: 'medium' }
    const onStop = vi.fn()

    render(
      <TaskTimer
        task={mockTask}
        durationMinutes={25}
        remainingSeconds={1500}
        isRunning={true}
        onClick={() => {}}
        onPause={() => {}}
        onResume={() => {}}
        onStop={onStop}
      />
    )

    fireEvent.click(screen.getByText('Stop'))
    expect(onStop).toHaveBeenCalledTimes(1)
  })

  it('debe mostrar la duración en minutos', () => {
    const mockTask = { id: '1', title: 'Tarea', priority: 'medium' }

    render(
      <TaskTimer
        task={mockTask}
        durationMinutes={30}
        remainingSeconds={1800}
        isRunning={true}
        onClick={() => {}}
        onPause={() => {}}
        onResume={() => {}}
        onStop={() => {}}
      />
    )

    expect(screen.getByText('30 min')).toBeTruthy()
  })

  it('debe deshabilitar botones cuando remainingSeconds es 0', () => {
    const mockTask = { id: '1', title: 'Tarea', priority: 'medium' }

    render(
      <TaskTimer
        task={mockTask}
        durationMinutes={25}
        remainingSeconds={0}
        isRunning={true}
        onClick={() => {}}
        onPause={() => {}}
        onResume={() => {}}
        onStop={() => {}}
      />
    )

    expect(screen.getByText('Pausar').disabled).toBe(true)
  })
})
