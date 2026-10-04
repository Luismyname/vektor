import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

const { supabaseMock, queryMock } = vi.hoisted(() => {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(),
    maybeSingle: vi.fn(),
    insert: vi.fn(),
  }
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  query.is.mockReturnValue(query)
  query.maybeSingle.mockResolvedValue({ data: null, error: null })

  return {
    supabaseMock: { from: vi.fn(() => query) },
    queryMock: query,
  }
})

vi.mock('../src/services/supabase', () => ({ supabase: supabaseMock }))

import { useWeeklyReview } from '../src/hooks/weekly-planner/useWeeklyReview'

describe('useWeeklyReview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryMock.select.mockReturnValue(queryMock)
    queryMock.eq.mockReturnValue(queryMock)
    queryMock.is.mockReturnValue(queryMock)
    queryMock.maybeSingle.mockResolvedValue({ data: null, error: null })
    queryMock.insert.mockResolvedValue({ error: null })
  })

  it('consulta la revisión con una fecha ISO cuando recibe un objeto Date', async () => {
    const { result } = renderHook(() => useWeeklyReview('user-1', new Date(2026, 8, 28, 0, 0, 0)))

    await waitFor(() => expect(queryMock.maybeSingle).toHaveBeenCalled())

    expect(supabaseMock.from).toHaveBeenCalledWith('weekly_planner')
    expect(queryMock.eq).toHaveBeenCalledWith('date', '2026-09-28')

    await result.current.saveReview({ learned: 'Una prueba' })

    expect(queryMock.insert).toHaveBeenCalledWith(expect.objectContaining({
      date: '2026-09-28',
      notes: JSON.stringify({ learned: 'Una prueba' }),
    }))
  })
})