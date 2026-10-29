import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { saveEnergyAtTaskEnd } = vi.hoisted(() => ({
  saveEnergyAtTaskEnd: vi.fn(async () => ({ data: null, error: null })),
}))

vi.mock('../src/services/energy', () => ({ saveEnergyAtTaskEnd }))

import FocusQualityModal from '../src/components/weekly-planner/forms/FocusQualityModal'

afterEach(cleanup)

describe('FocusQualityModal energy selector', () => {
  it('keeps the energy-at-end selector connected and submits the saved value', async () => {
    const onSubmit = vi.fn()
    render(
      <FocusQualityModal
        isOpen
        onClose={vi.fn()}
        onSubmit={onSubmit}
        durationMinutes={25}
        taskTitle="Preparar informe"
        userId="user-1"
      />,
    )

    fireEvent.change(screen.getByRole('slider', { name: 'Energía al finalizar (1-10)' }), {
      target: { value: '8' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar energía' }))

    await waitFor(() => expect(saveEnergyAtTaskEnd).toHaveBeenCalledWith('user-1', 8))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar calidad' }))

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ energyAtEnd: 8 }))
  })
})
