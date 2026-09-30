import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import SurveyForm from '../src/app/survey/components/SurveyForm'

// Mock de los servicios
vi.mock('../src/services/auth', () => ({
  getAuthenticatedUser: vi.fn(),
}))

vi.mock('../src/services/users', () => ({
  saveOnboarding: vi.fn(),
}))

vi.mock('../src/lib/habits', () => ({
  generateHabits: vi.fn(() => ['Hábito 1', 'Hábito 2']),
}))

import { getAuthenticatedUser } from '../src/services/auth'
import { saveOnboarding } from '../src/services/users'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function renderSurveyForm() {
  return render(
    <BrowserRouter>
      <SurveyForm />
    </BrowserRouter>
  )
}

// Helper para responder todas las preguntas
function answerAllQuestions() {
  const radioButtons = screen.getAllByRole('radio')
  // Responder cada pregunta con su primera opción
  for (let i = 0; i < radioButtons.length; i += 4) {
    fireEvent.click(radioButtons[i])
  }
}

describe('SurveyForm', () => {
  beforeEach(() => {
    getAuthenticatedUser.mockResolvedValue({ user: { id: 'user-123' }, error: null })
    saveOnboarding.mockResolvedValue({ error: null })
  })

  it('debe renderizar el formulario de onboarding', () => {
    renderSurveyForm()

    expect(screen.getByText('Conozcamos tu dirección')).toBeTruthy()
    expect(screen.getByText(/Responde estas 7 preguntas/)).toBeTruthy()
  })

  it('debe mostrar el botón de guardar', () => {
    renderSurveyForm()

    expect(screen.getByText('Guardar y entrar al panel')).toBeTruthy()
  })

  it('debe mostrar error cuando no todas las preguntas están respondidas', async () => {
    const { container } = renderSurveyForm()

    // Responder solo la primera pregunta (no todas)
    const radioButtons = screen.getAllByRole('radio')
    fireEvent.click(radioButtons[0])

    // Enviar el formulario directamente para evitar la validación nativa del navegador
    const form = container.querySelector('form')
    fireEvent.submit(form)

    // Esperar a que aparezca el mensaje de error
    const errorMessage = await screen.findByText('Responde las 7 preguntas para continuar.')
    expect(errorMessage).toBeTruthy()
  })

  it('debe permitir enviar cuando todas las preguntas están respondidas', async () => {
    renderSurveyForm()

    // Responder todas las preguntas
    answerAllQuestions()

    fireEvent.click(screen.getByText('Guardar y entrar al panel'))

    // No debería mostrar error de validación
    expect(screen.queryByText('Responde las 7 preguntas para continuar.')).toBeNull()
  })

  it('debe deshabilitar el botón mientras se envía', () => {
    renderSurveyForm()

    // Responder todas las preguntas
    answerAllQuestions()

    fireEvent.click(screen.getByText('Guardar y entrar al panel'))

    // El botón debería mostrar "Guardando..."
    expect(screen.getByText('Guardando...')).toBeTruthy()
  })

  it('debe mostrar las preguntas del cuestionario', () => {
    renderSurveyForm()

    // Verificar que hay preguntas (fieldsets)
    const fieldsets = screen.getAllByRole('group')
    expect(fieldsets.length).toBeGreaterThan(0)
  })

  it('debe permitir seleccionar opciones', () => {
    renderSurveyForm()

    const radioButtons = screen.getAllByRole('radio')
    fireEvent.click(radioButtons[0])

    expect(radioButtons[0].checked).toBe(true)
  })

  it('debe mostrar mensaje de error cuando falla el guardado', async () => {
    saveOnboarding.mockResolvedValue({ error: { message: 'Error de prueba', code: 'TEST' } })

    renderSurveyForm()

    // Responder todas las preguntas
    answerAllQuestions()

    fireEvent.click(screen.getByText('Guardar y entrar al panel'))

    // Esperar a que aparezca el mensaje de error
    const errorMessage = await screen.findByText(/No se pudo guardar tu perfil/)
    expect(errorMessage).toBeTruthy()
  })
})
