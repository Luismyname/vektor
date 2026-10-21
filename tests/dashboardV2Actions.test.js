import { describe, expect, it } from 'vitest'
import { selectNextDashboardAction } from '../src/lib/dashboardV2Actions'

const tasks = [
  { id: 'task-leroy', title: 'Leroy', status: 'pending', estimated_duration: 30 },
]
const habits = [
  { id: 'habit-plan', title: 'Planificar 3 tareas', active: true },
  { id: 'habit-review', title: 'Revisar progreso semanal', active: true },
]
const entries = [
  {
    id: 'habit-entry-11',
    date: '2026-10-21',
    start_time: '11:00:00',
    end_time: '11:30:00',
    habit_id: 'habit-plan',
    status: 'scheduled',
  },
  {
    id: 'habit-entry-12',
    date: '2026-10-21',
    start_time: '12:00:00',
    end_time: '12:30:00',
    habit_id: 'habit-review',
    status: 'scheduled',
  },
  {
    id: 'task-entry-15',
    date: '2026-10-21',
    start_time: '15:00:00',
    end_time: '15:30:00',
    task_id: 'task-leroy',
    status: 'scheduled',
  },
]

function selectAt(hour, minute, overrides = {}) {
  return selectNextDashboardAction({
    entries,
    tasks,
    habits,
    now: new Date(2026, 9, 21, hour, minute),
    ...overrides,
  })
}

describe('selectNextDashboardAction', () => {
  it('selecciona el hábito programado antes que las tareas posteriores', () => {
    const action = selectAt(10, 45)

    expect(action).toMatchObject({
      id: 'habit-entry-11',
      plannerEntryId: 'habit-entry-11',
      type: 'habit',
      title: 'Planificar 3 tareas',
      status: 'upcoming',
      scheduledDuration: 30,
      startsInMinutes: 15,
    })
  })

  it('selecciona la tarea de las 15:00 como próxima antes de su inicio', () => {
    const action = selectAt(14, 50, {
      entries: entries.slice(2),
    })

    expect(action).toMatchObject({
      plannerEntryId: 'task-entry-15',
      type: 'task',
      title: 'Leroy',
      status: 'upcoming',
    })
  })

  it('conserva la misma tarea pendiente y la marca retrasada tras su hora', () => {
    const action = selectAt(15, 12, {
      entries: entries.slice(2),
    })

    expect(action).toMatchObject({
      plannerEntryId: 'task-entry-15',
      status: 'delayed',
      delayMinutes: 12,
    })
  })

  it('prioriza la acción iniciada aunque haya otras ocurrencias anteriores', () => {
    const action = selectAt(15, 12, {
      activeTask: tasks[0],
      activeFocusSession: {
        task_id: 'task-leroy',
        status: 'running',
        started_at: '2026-10-21T13:12:00',
      },
    })

    expect(action).toMatchObject({
      plannerEntryId: 'task-entry-15',
      status: 'active',
      actualStart: new Date('2026-10-21T13:12:00'),
    })
  })

  it('conserva en curso la acción iniciada tarde y expone el retraso inicial', () => {
    const action = selectAt(15, 20, {
      entries: entries.slice(2),
      activeTask: tasks[0],
      activeFocusSession: {
        task_id: 'task-leroy',
        status: 'running',
        started_at: '2026-10-21T15:12:00',
      },
    })

    expect(action).toMatchObject({
      plannerEntryId: 'task-entry-15',
      status: 'active',
      startOffsetMinutes: 12,
    })
  })

  it('omite completadas, fallidas y no accionables, pero conserva la ocurrencia reprogramada', () => {
    const action = selectNextDashboardAction({
      entries: [
        { ...entries[0], status: 'completed' },
        { ...entries[1], status: 'failed' },
        { ...entries[2], start_time: '10:30:00', end_time: '11:00:00', status: 'moved' },
        { id: 'reminder', date: '2026-10-21', start_time: '10:00:00', end_time: '10:15:00', status: 'scheduled' },
      ],
      tasks,
      habits,
      now: new Date(2026, 9, 21, 10, 0),
    })

    expect(action.plannerEntryId).toBe('task-entry-15')
    expect(action.status).toBe('upcoming')
  })

  it('muestra el siguiente elemento después de completar el anterior', () => {
    const action = selectNextDashboardAction({
      entries: [
        { ...entries[0], status: 'completed' },
        ...entries.slice(1),
      ],
      tasks,
      habits,
      now: new Date(2026, 9, 21, 11, 15),
    })

    expect(action.plannerEntryId).toBe('habit-entry-12')
  })
})
