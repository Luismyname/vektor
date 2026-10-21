import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthContext } from '../src/context/AuthContext'
import OnboardingWizard from '../src/components/onboarding/OnboardingWizard'

vi.mock('../src/services/auth', () => ({
  updateProfile: vi.fn(),
}))

import { updateProfile } from '../src/services/auth'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('OnboardingWizard', () => {
  it('completes onboarding and navigates to the main dashboard', async () => {
    const completeOnboarding = vi.fn()
    updateProfile.mockResolvedValue({ error: null })

    render(
      <AuthContext.Provider value={{ user: { id: 'user-123' }, completeOnboarding }}>
        <MemoryRouter initialEntries={['/onboarding']}>
          <Routes>
            <Route path="/onboarding" element={<OnboardingWizard />} />
            <Route path="/dashboard-v2" element={<p>Dashboard V2</p>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    while (screen.queryByRole('button', { name: /Siguiente/ })) {
      fireEvent.click(screen.getByRole('button', { name: /Siguiente/ }))
    }
    fireEvent.click(screen.getByRole('button', { name: 'Comenzar con Vektor' }))

    await waitFor(() => expect(screen.getByText('Dashboard V2')).toBeTruthy())
    expect(updateProfile).toHaveBeenCalledWith('user-123', expect.objectContaining({
      completed_onboarding: true,
    }))
    expect(completeOnboarding).toHaveBeenCalledOnce()
  })
})
