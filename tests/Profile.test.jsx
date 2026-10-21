import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Profile from '../src/app/profile'

vi.mock('../src/services/auth', () => ({
  getAuthenticatedUser: vi.fn(),
  getCurrentProfile: vi.fn(),
}))

vi.mock('../src/services/users', () => ({
  updateHiddenAnswers: vi.fn(),
  updateProfile: vi.fn(),
}))

vi.mock('../src/app/survey/questions', () => ({
  questions: [
    ['¿Cuál es tu valor principal?'],
    ['¿Qué te motiva?'],
  ],
}))

import { getAuthenticatedUser, getCurrentProfile } from '../src/services/auth'
import { updateHiddenAnswers } from '../src/services/users'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('Profile onboarding answers', () => {
  it('shows saved answers and persists visibility changes from Profile', async () => {
    const user = { id: 'user-123', email: 'test@example.com', user_metadata: {} }
    getAuthenticatedUser.mockResolvedValue({ user, error: null })
    getCurrentProfile.mockResolvedValue({
      profile: {
        answers: { 1: 'Honestidad', 2: 'Mi familia' },
        hidden_answers: { 1: true },
      },
      error: null,
    })
    updateHiddenAnswers.mockResolvedValue({ error: null })

    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Tus respuestas de onboarding')).toBeTruthy()
    expect(screen.getByText('Respuesta oculta')).toBeTruthy()
    expect(screen.getByText('Mi familia')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar' }))

    await waitFor(() => {
      expect(updateHiddenAnswers).toHaveBeenCalledWith('user-123', {})
      expect(screen.getByText('Honestidad')).toBeTruthy()
    })
  })
})
