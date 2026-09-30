import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import DashboardTasks from '../src/app/dashboard/components/DashboardTasks'

describe('DashboardTasks', () => {
  it('no muestra las tareas completadas en el dashboard', () => {
    render(
      <DashboardTasks
        tasks={[
          { id: 'completed-task', title: 'Tarea completada', status: 'completed' },
          { id: 'pending-task', title: 'Tarea pendiente', status: 'pending' },
        ]}
      />,
    )

    expect(screen.getAllByText('Tarea pendiente')).toHaveLength(2)
    expect(screen.queryByText('Tarea completada')).not.toBeInTheDocument()
    expect(screen.queryByText('Tareas completadas')).not.toBeInTheDocument()
  })
})