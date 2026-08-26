import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }))
vi.mock('../src/services/auth', () => ({ getAuthenticatedUser: vi.fn().mockResolvedValue({ user: { id: 'user-1' } }) }))
vi.mock('../src/services/users', () => ({ saveOnboarding: vi.fn().mockResolvedValue({ error: null }) }))

import SurveyForm from '../src/app/survey/components/SurveyForm'

describe('SurveyForm', () => {
  beforeEach(() => vi.clearAllMocks())

  it('exige responder todas las preguntas', () => {
    render(<SurveyForm />)
    fireEvent.submit(screen.getByRole('button', { name: 'Guardar y entrar al panel' }).closest('form'))
    expect(screen.getByRole('alert')).toHaveTextContent('Responde las 7 preguntas para continuar.')
  })
})