export type TaskPriority = 'low' | 'medium' | 'high'

export type TaskStatus = 'pending' | 'in_progress' | 'completed'

export type HabitSource = 'recommended' | 'custom'

export interface Task {
  id: string
  user_id: string
  title: string
  description: string | null
  priority: TaskPriority
  status: TaskStatus
  related_value: string | null
  created_at: string
  completed_at: string | null
  energy_cost: number
  cognitive_load: string
  work_type: string
  estimated_duration: number
  actual_duration: number | null
}

export interface Habit {
  id: string
  user_id?: string
  title: string
  description?: string
  duration_minutes?: number
  color?: string
  frequency?: string
  active: boolean
  source?: HabitSource
  value?: string
}

export interface HabitGroups<T extends Habit = Habit> {
  recommended: T[]
  custom: T[]
}
