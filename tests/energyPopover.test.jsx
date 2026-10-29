import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EnergyPopoverProvider } from '../src/context/EnergyPopoverContext'
import { useEnergyPopover } from '../src/hooks/useEnergyPopover'

afterEach(cleanup)

function OpenPopoverButton() {
  const { openEnergyPopover } = useEnergyPopover()
  return (
    <button
      type="button"
      onClick={() => openEnergyPopover({ label: 'Energía inicial', onSave: vi.fn() })}
    >
      Abrir energía
    </button>
  )
}

describe('energy popover context and accessibility', () => {
  it('exposes a callable API, autofocuses the slider, and closes on Escape', () => {
    render(
      <EnergyPopoverProvider>
        <OpenPopoverButton />
      </EnergyPopoverProvider>,
    )

    expect(screen.getAllByRole('button', { name: 'Abrir energía' })).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Abrir energía' }))

    const slider = screen.getByRole('slider', { name: 'Nivel de energía' })
    expect(slider).toHaveFocus()
    expect(screen.getByRole('dialog', { name: 'Seleccionar Energía inicial' })).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(screen.queryByRole('dialog', { name: 'Seleccionar Energía inicial' })).not.toBeInTheDocument()
  })

  it('closes when clicking outside the popover', () => {
    render(
      <EnergyPopoverProvider>
        <OpenPopoverButton />
      </EnergyPopoverProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Abrir energía' }))
    fireEvent.pointerDown(document.body)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
