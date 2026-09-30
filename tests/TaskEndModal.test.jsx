import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TaskEndModal from '../src/app/dashboard/components/TaskEndModal'

afterEach(cleanup)

describe('TaskEndModal', () => {
  it('llama al handler al pulsar Terminar', () => {
    const onFinish = vi.fn()
    render(<TaskEndModal isOpen onFinish={onFinish} />)

    fireEvent.click(screen.getByRole('button', { name: 'Terminar' }))

    expect(onFinish).toHaveBeenCalledOnce()
  })

  it('deshabilita las acciones mientras finaliza y muestra errores', () => {
    render(<TaskEndModal isOpen isFinishing errorMessage="No se pudo guardar." />)

    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo guardar.')
    expect(screen.getByRole('button', { name: 'Finalizando...' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled()
  })
})
