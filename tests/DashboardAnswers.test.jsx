import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import DashboardAnswers from '../src/app/dashboard/components/DashboardAnswers'

afterEach(() => {
  cleanup()
})

// Mock de questions
vi.mock('../src/app/survey/questions', () => ({
  questions: [
    ['¿Cuál es tu valor principal?'],
    ['¿Qué te motiva a levantarte?'],
    ['¿Cuál es tu mayor fortaleza?'],
  ],
}))

describe('DashboardAnswers', () => {
  const mockProfile = {
    answers: {
      1: 'Honestidad',
      2: 'Mi familia',
      3: 'Perseverancia',
    },
  }

  it('debe renderizar el título de la sección', () => {
    render(
      <DashboardAnswers
        profile={mockProfile}
        hiddenAnswers={{}}
        onHide={() => {}}
        onShow={() => {}}
      />
    )

    expect(screen.getByText('Tus respuestas')).toBeTruthy()
  })

  it('debe mostrar las respuestas del perfil', () => {
    render(
      <DashboardAnswers
        profile={mockProfile}
        hiddenAnswers={{}}
        onHide={() => {}}
        onShow={() => {}}
      />
    )

    expect(screen.getByText('Honestidad')).toBeTruthy()
    expect(screen.getByText('Mi familia')).toBeTruthy()
    expect(screen.getByText('Perseverancia')).toBeTruthy()
  })

  it('debe mostrar "Sin respuesta" cuando no hay respuesta', () => {
    const emptyProfile = { answers: {} }

    render(
      <DashboardAnswers
        profile={emptyProfile}
        hiddenAnswers={{}}
        onHide={() => {}}
        onShow={() => {}}
      />
    )

    expect(screen.getAllByText('Sin respuesta').length).toBe(3)
  })

  it('debe mostrar "Respuesta oculta" cuando está oculta', () => {
    render(
      <DashboardAnswers
        profile={mockProfile}
        hiddenAnswers={{ '1': true }}
        onHide={() => {}}
        onShow={() => {}}
      />
    )

    expect(screen.getByText('Respuesta oculta')).toBeTruthy()
  })

  it('debe llamar onHide cuando se hace clic en Ocultar', () => {
    const onHide = vi.fn()

    render(
      <DashboardAnswers
        profile={mockProfile}
        hiddenAnswers={{}}
        onHide={onHide}
        onShow={() => {}}
      />
    )

    const hideButtons = screen.getAllByText('Ocultar')
    fireEvent.click(hideButtons[0])

    expect(onHide).toHaveBeenCalledWith('1')
  })

  it('debe llamar onShow cuando se hace clic en Mostrar', () => {
    const onShow = vi.fn()

    render(
      <DashboardAnswers
        profile={mockProfile}
        hiddenAnswers={{ '1': true }}
        onHide={() => {}}
        onShow={onShow}
      />
    )

    fireEvent.click(screen.getByText('Mostrar'))

    expect(onShow).toHaveBeenCalledWith('1')
  })

  it('debe mostrar mensaje cuando no hay respuestas', () => {
    const emptyProfile = { answers: {} }

    render(
      <DashboardAnswers
        profile={emptyProfile}
        hiddenAnswers={{}}
        onHide={() => {}}
        onShow={() => {}}
      />
    )

    // Debería mostrar "No hay respuestas disponibles." si no hay preguntas
    // Pero como tenemos 3 preguntas mockeadas, no debería aparecer
    expect(screen.queryByText('No hay respuestas disponibles.')).toBeNull()
  })

  it('debe mostrar las preguntas correctamente', () => {
    render(
      <DashboardAnswers
        profile={mockProfile}
        hiddenAnswers={{}}
        onHide={() => {}}
        onShow={() => {}}
      />
    )

    expect(screen.getByText('¿Cuál es tu valor principal?')).toBeTruthy()
    expect(screen.getByText('¿Qué te motiva a levantarte?')).toBeTruthy()
    expect(screen.getByText('¿Cuál es tu mayor fortaleza?')).toBeTruthy()
  })
})
