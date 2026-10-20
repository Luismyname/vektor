import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { ThemeProvider } from '../src/context/ThemeProvider'
import { useTheme } from '../src/hooks/useTheme'

const mocks = vi.hoisted(() => ({
  authListener: null,
  onAuthStateChange: vi.fn(),
  getUserTheme: vi.fn(),
  updateUserTheme: vi.fn(),
}))

vi.mock('../src/services/supabase', () => ({
  supabase: { auth: { onAuthStateChange: mocks.onAuthStateChange } },
}))

vi.mock('../src/services/theme', () => ({
  getUserTheme: mocks.getUserTheme,
  updateUserTheme: mocks.updateUserTheme,
}))

function ThemeDisplay() {
  const { theme } = useTheme()
  return <p>{theme}</p>
}

describe('ThemeProvider account synchronization', () => {
  beforeEach(() => {
    localStorage.clear()
    mocks.authListener = null
    mocks.onAuthStateChange.mockImplementation((listener) => {
      mocks.authListener = listener
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    })
    mocks.getUserTheme.mockImplementation(async (userId) => ({
      theme: userId === 'first-user' ? 'light' : 'dark',
      error: null,
    }))
    mocks.updateUserTheme.mockResolvedValue({ error: null })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('loads the new account theme when accounts change without a reload', async () => {
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    )

    expect(mocks.onAuthStateChange).toHaveBeenCalled()
    expect(mocks.authListener).toEqual(expect.any(Function))
    act(() => mocks.authListener('SIGNED_IN', { user: { id: 'first-user' } }))
    await waitFor(() => expect(screen.getByText('light')).toBeInTheDocument())

    act(() => mocks.authListener('SIGNED_IN', { user: { id: 'second-user' } }))
    await waitFor(() => expect(screen.getByText('dark')).toBeInTheDocument())

    expect(mocks.getUserTheme).toHaveBeenNthCalledWith(1, 'first-user')
    expect(mocks.getUserTheme).toHaveBeenNthCalledWith(2, 'second-user')
    expect(localStorage.getItem('vektor-theme')).toBe('dark')
  })
})
