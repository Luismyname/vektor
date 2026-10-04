import { beforeEach, describe, expect, it, vi } from 'vitest'

const { supabaseMock, queryMock, state } = vi.hoisted(() => {
  const state = { result: { data: null, error: null } }
  const query = {
    insert: vi.fn(),
    update: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
  }
  for (const method of ['insert', 'update', 'select', 'eq', 'in', 'order', 'limit']) {
    query[method].mockReturnValue(query)
  }
  query.single.mockImplementation(() => Promise.resolve(state.result))
  query.maybeSingle.mockImplementation(() => Promise.resolve(state.result))
  return {
    supabaseMock: { from: vi.fn(() => query) },
    queryMock: query,
    state,
  }
})

vi.mock('../src/services/supabase', () => ({ supabase: supabaseMock }))

import { getActiveFocusSession, startFocusSession, transitionFocusSession } from '../src/services/focus-sessions'

describe('focus sessions service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.result = { data: null, error: null }
    for (const method of ['insert', 'update', 'select', 'eq', 'in', 'order', 'limit']) {
      queryMock[method].mockReturnValue(queryMock)
    }
    queryMock.single.mockImplementation(() => Promise.resolve(state.result))
    queryMock.maybeSingle.mockImplementation(() => Promise.resolve(state.result))
  })

  it('crea una sesión con la duración planeada en segundos', async () => {
    const session = { id: 'session-1', status: 'running' }
    state.result = { data: session, error: null }

    const result = await startFocusSession('user-1', 'task-1', 25)

    expect(supabaseMock.from).toHaveBeenCalledWith('focus_sessions')
    expect(queryMock.insert).toHaveBeenCalledWith({
      user_id: 'user-1',
      task_id: 'task-1',
      planned_duration_seconds: 1500,
    })
    expect(result).toEqual({ session, error: null })
  })

  it('transiciona el estado de una sesión existente', async () => {
    const session = { id: 'session-1', status: 'paused' }
    state.result = { data: session, error: null }

    await transitionFocusSession('session-1', 'paused')

    expect(queryMock.update).toHaveBeenCalledWith({ status: 'paused' })
    expect(queryMock.eq).toHaveBeenCalledWith('id', 'session-1')
  })

  it('recupera la sesión activa o pausada más reciente del usuario', async () => {
    state.result = { data: { id: 'session-1', status: 'running' }, error: null }

    const result = await getActiveFocusSession('user-1')

    expect(queryMock.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(queryMock.in).toHaveBeenCalledWith('status', ['running', 'paused'])
    expect(result.session.id).toBe('session-1')
  })
})