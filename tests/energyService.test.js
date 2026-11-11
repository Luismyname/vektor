import { beforeEach, describe, expect, it, vi } from 'vitest'

const { query, supabase } = vi.hoisted(() => {
  const result = { data: { id: 'energy-1' }, error: null }
  const query = {
    upsert: vi.fn(),
    select: vi.fn(),
    single: vi.fn(() => Promise.resolve(result)),
  }
  query.upsert.mockReturnValue(query)
  query.select.mockReturnValue(query)
  return {
    query,
    supabase: { from: vi.fn(() => query) },
  }
})

vi.mock('../src/services/supabase', () => ({ supabase }))

import {
  saveEnergyAtHabitCompletion,
  saveEnergyAtTaskEnd,
  saveEnergyAtTaskStart,
  saveEnergyCheckIn,
} from '../src/services/energy'

describe('energy service SQL compatibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    query.upsert.mockReturnValue(query)
    query.select.mockReturnValue(query)
  })

  it.each([
    ['task start', saveEnergyAtTaskStart],
    ['task end', saveEnergyAtTaskEnd],
    ['habit completion', saveEnergyAtHabitCompletion],
  ])('maps %s to the permitted checkin source and known columns', async (_label, save) => {
    await save('user-1', 7)

    expect(supabase.from).toHaveBeenCalledWith('energy_levels')
    const [row, options] = query.upsert.mock.calls[0]
    expect(row).toMatchObject({
      user_id: 'user-1',
      energy_level: 7,
      source: 'checkin',
    })
    expect(row).toHaveProperty('date')
    expect(row.hour).toBeGreaterThanOrEqual(0)
    expect(row.hour).toBeLessThanOrEqual(23)
    expect(row).not.toHaveProperty('related_id')
    expect(row).not.toHaveProperty('related_type')
    expect(options).toEqual({ onConflict: 'user_id,date,hour' })
  })

  it('maps habit start captures to the existing checkin source', async () => {
    const { saveEnergyAtMoment } = await import('../src/services/energy')
    await saveEnergyAtMoment('user-1', 6, 'habit_start')

    expect(query.upsert.mock.calls[0][0].source).toBe('checkin')
  })

  it('rejects values outside the persisted energy range', async () => {
    const result = await saveEnergyCheckIn('user-1', '2026-10-25', 9, 11, 'manual')

    expect(result.error).toBeInstanceOf(Error)
    expect(query.upsert).not.toHaveBeenCalled()
  })

  it('rejects unsupported source values before making a database request', async () => {
    await expect(
      saveEnergyCheckIn('user-1', '2026-10-25', 9, 7, 'task_start_invalid'),
    ).rejects.toThrow('Origen de energía no permitido')

    expect(query.upsert).not.toHaveBeenCalled()
  })
})
