import { describe, expect, it } from 'vitest'
import {
  findNextAvailablePlannerSlot,
  findPlannerConflicts,
  getPlannerEntryDuration,
  hasHabitOnDate,
} from '../src/services/planner-automation'

const task = {
  id: 'task-entry',
  date: '2026-11-12',
  start_time: '09:00',
  end_time: '10:00',
  task_id: 'task-1',
  status: 'scheduled',
}

describe('planner automation constraints', () => {
  it('treats adjacent activities as non-overlapping and rejects partial overlaps', () => {
    const adjacent = { ...task, id: 'adjacent', start_time: '10:00', end_time: '10:30' }
    const overlap = { ...task, id: 'overlap', start_time: '09:45', end_time: '10:15' }

    expect(findPlannerConflicts(task, [adjacent])).toEqual([])
    expect(findPlannerConflicts(task, [overlap])).toEqual([overlap])
  })

  it('detects an activity inside an overnight sleep obligation', () => {
    const sleep = {
      id: 'sleep',
      date: '2026-11-12',
      start_time: '23:00',
      end_time: '07:00',
      obligation_id: 'obligation-1',
      obligation: { obligation_type: 'sleep' },
    }

    expect(findPlannerConflicts({
      ...task,
      date: '2026-11-13',
      start_time: '06:30',
      end_time: '07:30',
    }, [sleep])).toEqual([sleep])
  })

  it('enforces a single occurrence of a habit per date', () => {
    const habit = { ...task, habit_id: 'habit-1', task_id: null }

    expect(hasHabitOnDate('habit-1', task.date, [habit])).toBe(true)
    expect(hasHabitOnDate('habit-1', '2026-11-13', [habit])).toBe(false)
    expect(hasHabitOnDate('habit-1', task.date, [habit], habit.id)).toBe(false)
  })

  it('finds the next complete free slot and includes obligations and reminders as blockers', () => {
    const obligation = {
      id: 'work',
      date: task.date,
      start_time: '10:00',
      end_time: '11:00',
      obligation_id: 'obligation-1',
    }
    const reminder = {
      id: 'reminder',
      date: task.date,
      start_time: '11:00',
      end_time: '11:30',
    }

    const conflictingOriginal = { ...task, id: 'existing', task_id: 'other-task' }
    expect(findNextAvailablePlannerSlot(task, [task, conflictingOriginal, obligation, reminder])).toEqual({
      date: task.date,
      startTime: '11:30',
      endTime: '12:30',
    })
    expect(getPlannerEntryDuration(task)).toBe(60)
  })

  it('never returns a slot more than 48 hours after the original activity', () => {
    const occupied = Array.from({ length: 229 }, (_, index) => {
      const start = index * 15
      const date = new Date(Date.parse(`${task.date}T00:00:00Z`) + start * 60_000)
        .toISOString()
        .slice(0, 10)
      const minuteOfDay = start % (24 * 60)
      const formatTime = (minute) => `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`
      return {
        id: `block-${index}`,
        date,
        start_time: formatTime(minuteOfDay),
        end_time: formatTime(minuteOfDay + 15),
        task_id: `other-${index}`,
      }
    })

    expect(findNextAvailablePlannerSlot(task, [
      task,
      { ...task, id: 'block-original', task_id: 'other-original' },
      ...occupied,
    ])).toBeNull()
  })

  it('moves a repeated habit to another day and avoids a duplicate occurrence', () => {
    const habit = { ...task, habit_id: 'habit-1', task_id: null }
    const sameDayHabit = {
      ...habit,
      id: 'other-habit-entry',
      date: task.date,
      start_time: '12:00',
      end_time: '12:30',
    }
    const blockers = Array.from({ length: 192 }, (_, index) => {
      const minute = index * 15
      const day = minute < 1440 ? task.date : '2026-11-13'
      const time = minute % 1440
      return {
        id: `block-${index}`,
        date: day,
        start_time: `${String(Math.floor(time / 60)).padStart(2, '0')}:${String(time % 60).padStart(2, '0')}`,
        end_time: `${String(Math.floor((time + 15) / 60)).padStart(2, '0')}:${String((time + 15) % 60).padStart(2, '0')}`,
        task_id: `task-${index}`,
      }
    })

    expect(findNextAvailablePlannerSlot(habit, [habit, sameDayHabit, ...blockers])).toMatchObject({
      date: '2026-11-14',
    })
  })
})
