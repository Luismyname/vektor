import { beforeEach, describe, expect, it, vi } from 'vitest'

const { supabase } = vi.hoisted(() => ({
  supabase: {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
  },
}))

vi.mock('../src/services/supabase', () => ({ supabase }))

import { saveOnboarding } from '../src/services/users'

describe('saveOnboarding', () => {
  beforeEach(() => vi.clearAllMocks())

  it('actualiza el perfil del usuario autenticado con onboarding completo', async () => {
    const hiddenAnswers = { answer1: true }
    const profileLookup = {
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'profile-1', hidden_answers: hiddenAnswers }, error: null }),
    }
    const profileUpdate = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'profile-1', user_id: 'auth-user-1', completed_onboarding: true }, error: null }),
    }
    const profiles = {
      select: vi.fn().mockReturnValue(profileLookup),
      update: vi.fn().mockReturnValue(profileUpdate),
    }
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'auth-user-1' } }, error: null })
    supabase.from.mockReturnValue(profiles)

    await saveOnboarding({
      user: { id: 'auth-user-1' },
      answers: { 1: 'salud' },
      dominantValue: 'salud',
      secondaryValue: 'bienestar',
      habits: { recommended: [], custom: [] },
    })

    expect(supabase.auth.getUser).toHaveBeenCalledOnce()
    expect(profileLookup.eq).toHaveBeenCalledWith('user_id', 'auth-user-1')
    expect(profiles.update).toHaveBeenCalledWith(expect.objectContaining({
      answers: { 1: 'salud' },
      hidden_answers: hiddenAnswers,
      dominant_value: 'salud',
      secondary_value: 'bienestar',
      habits: { recommended: [], custom: [] },
      completed_onboarding: true,
    }))
    expect(profileUpdate.eq).toHaveBeenCalledWith('user_id', 'auth-user-1')
  })
})