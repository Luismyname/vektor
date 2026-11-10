import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

const { supabaseMock, queryMock, writeResult } = vi.hoisted(() => {
  const result = { current: { error: null } }
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    then: (resolve, reject) => Promise.resolve(result.current).then(resolve, reject),
  }
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  query.insert.mockReturnValue(query)
  query.update.mockReturnValue(query)

  return {
    supabaseMock: { from: vi.fn(() => query) },
    queryMock: query,
    writeResult: result,
  }
})

vi.mock('../src/services/supabase', () => ({ supabase: supabaseMock }))

import { useWeeklyReview } from '../src/hooks/weekly-planner/useWeeklyReview'

describe('useWeeklyReview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryMock.select.mockReturnValue(queryMock)
    queryMock.eq.mockReturnValue(queryMock)
    queryMock.insert.mockReturnValue(queryMock)
    queryMock.update.mockReturnValue(queryMock)
    queryMock.maybeSingle.mockResolvedValue({ data: null, error: null })
    writeResult.current = { error: null }
  })

  it('carga answers JSONB usando la fecha ISO', async () => {
    const answers = { learned: 'Una prueba', extraField: 'Conservado' }
    queryMock.maybeSingle.mockResolvedValue({ data: { answers }, error: null })
    const { result } = renderHook(() => useWeeklyReview('user-1', new Date(2026, 8, 28, 0, 0, 0)))

    await waitFor(() => expect(result.current.review).toEqual(answers))

    expect(supabaseMock.from).toHaveBeenCalledWith('weekly_reviews')
    expect(queryMock.select).toHaveBeenCalledWith('answers')
    expect(queryMock.eq).toHaveBeenCalledWith('review_date', '2026-09-28')
  })

  it('inserta una revisión nueva en weekly_reviews', async () => {
    const answers = { learned: 'Una prueba', extraField: 'Conservado' }
    const { result } = renderHook(() => useWeeklyReview('user-1', new Date(2026, 8, 28, 0, 0, 0)))

    await waitFor(() => expect(queryMock.maybeSingle).toHaveBeenCalled())
    await result.current.saveReview(answers)

    expect(queryMock.insert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'user-1',
      review_date: '2026-09-28',
      answers,
    }))
    expect(supabaseMock.from).not.toHaveBeenCalledWith('weekly_planner')
  })

  it('actualiza la revisión existente', async () => {
    queryMock.maybeSingle
      .mockResolvedValueOnce({ data: { answers: { learned: 'Anterior' } }, error: null })
      .mockResolvedValueOnce({ data: { id: 'review-1' }, error: null })
    const { result } = renderHook(() => useWeeklyReview('user-1', '2026-09-28'))

    await waitFor(() => expect(result.current.review).toEqual({ learned: 'Anterior' }))
    await result.current.saveReview({ learned: 'Actualizada', keptHabit: 'Caminar' })

    expect(queryMock.update).toHaveBeenCalledWith(expect.objectContaining({
      answers: { learned: 'Actualizada', keptHabit: 'Caminar' },
      review_date: '2026-09-28',
    }))
    expect(queryMock.eq).toHaveBeenCalledWith('id', 'review-1')
    expect(supabaseMock.from).not.toHaveBeenCalledWith('weekly_planner')
  })
})
