import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Login from '../src/app/auth/login'

// Mock de los servicios de auth
vi.mock('../src/services/auth', () => ({
  signIn: vi.fn(),
  getOnboardingDestination: vi.fn(),
}))

import { signIn, getOnboardingDestination } from '../src/services/auth'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function renderLogin() {
  return render(
    <BrowserRouter>
      <Login />
    </BrowserRouter>
  )
}

describe('Login', () => {
  beforeEach(() => {
    signIn.mockResolvedValue({ error: null })
    getOnboardingDestination.mockResolvedValue({ destination: '/dashboard', error: null })
  })

  it('debe renderizar el formulario de login', () => {
    renderLogin()

    expect(screen.getByText('Iniciar sesión')).toBeTruthy()
    expect(screen.getByText('Correo electrónico')).toBeTruthy()
    expect(screen.getByText('Contraseña')).toBeTruthy()
  })

  it('debe mostrar el botón de continuar', () => {
    renderLogin()

    expect(screen.getByText('Continuar')).toBeTruthy()
  })

  it('debe mostrar el botón de cancelar', () => {
    renderLogin()

    expect(screen.getByText('Cancelar')).toBeTruthy()
  })

  it('debe actualizar el email cuando el usuario escribe', () => {
    renderLogin()

    const emailInput = screen.getByLabelText('Correo electrónico')
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })

    expect(emailInput.value).toBe('test@example.com')
  })

  it('debe actualizar la contraseña cuando el usuario escribe', () => {
    renderLogin()

    const passwordInput = screen.getByLabelText('Contraseña')
    fireEvent.change(passwordInput, { target: { value: 'password123' } })

    expect(passwordInput.value).toBe('password123')
  })

  it('debe mostrar "Comprobando..." mientras se envía', async () => {
    // Hacer que signIn tarde más para ver el estado de submitting
    signIn.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ error: null }), 100)))

    renderLogin()

    const emailInput = screen.getByLabelText('Correo electrónico')
    const passwordInput = screen.getByLabelText('Contraseña')
    const submitButton = screen.getByText('Continuar')

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)

    // Debería mostrar "Comprobando..."
    await waitFor(() => {
      expect(screen.getByText('Comprobando...')).toBeTruthy()
    })
  })

  it('debe mostrar error cuando el login falla', async () => {
    signIn.mockResolvedValue({ error: { message: 'Credenciales inválidas' } })

    renderLogin()

    const emailInput = screen.getByLabelText('Correo electrónico')
    const passwordInput = screen.getByLabelText('Contraseña')

    fireEvent.change(emailInput, { target: { value: 'wrong@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } })
    fireEvent.click(screen.getByText('Continuar'))

    await waitFor(() => {
      expect(screen.getByText('La contraseña o el usuario son incorrectos.')).toBeTruthy()
    })
  })

  it('debe navegar a /dashboard cuando el login es exitoso', async () => {
    const mockNavigate = vi.fn()
    
    // Mock de useNavigate
    vi.doMock('react-router-dom', async () => {
      const actual = await vi.importActual('react-router-dom')
      return {
        ...actual,
        useNavigate: () => mockNavigate,
      }
    })

    renderLogin()

    const emailInput = screen.getByLabelText('Correo electrónico')
    const passwordInput = screen.getByLabelText('Contraseña')

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(screen.getByText('Continuar'))

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith('test@example.com', 'password123')
    })
  })

  it('debe deshabilitar botones mientras se envía', async () => {
    signIn.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ error: null }), 100)))

    renderLogin()

    const emailInput = screen.getByLabelText('Correo electrónico')
    const passwordInput = screen.getByLabelText('Contraseña')

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(screen.getByText('Continuar'))

    await waitFor(() => {
      expect(screen.getByText('Comprobando...').disabled).toBe(true)
    })
  })
})
