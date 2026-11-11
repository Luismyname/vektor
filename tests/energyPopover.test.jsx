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
  it('exposes a callable API, autofocuses the empty ray scale, supports keyboard selection, and closes on Escape', () => {
    render(
      <EnergyPopoverProvider>
        <OpenPopoverButton />
      </EnergyPopoverProvider>,
    )

    expect(screen.getAllByRole('button', { name: 'Abrir energía' })).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Abrir energía' }))

    const firstRay = screen.getByRole('radio', { name: 'Energía 1 de 10' })
    expect(firstRay).toHaveFocus()
    expect(screen.getAllByRole('radio')).toHaveLength(10)
    expect(screen.getByText('Selecciona energía')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Seleccionar Energía inicial' })).toBeInTheDocument()

    fireEvent.keyDown(firstRay, { key: 'ArrowRight' })
    expect(screen.getByRole('radio', { name: 'Energía 2 de 10' })).toHaveFocus()
    expect(screen.getByText('Energía: 2 / 10')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(screen.queryByRole('dialog', { name: 'Seleccionar Energía inicial' })).not.toBeInTheDocument()
  })

  it('previews rays on hover and saves the selected level', async () => {
    const onSave = vi.fn()
    function OpenWithSave() {
      const { openEnergyPopover } = useEnergyPopover()
      return <button type="button" onClick={() => openEnergyPopover({ onSave })}>Abrir</button>
    }

    render(
      <EnergyPopoverProvider>
        <OpenWithSave />
      </EnergyPopoverProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Abrir' }))

    const raySix = screen.getByRole('radio', { name: 'Energía 6 de 10' })
    fireEvent.pointerEnter(raySix)
    expect(screen.getAllByRole('radio').filter((ray) => ray.classList.contains('is-lit'))).toHaveLength(6)

    fireEvent.click(raySix)
    expect(screen.getByText('Energía: 6 / 10')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    await vi.waitFor(() => expect(onSave).toHaveBeenCalledWith(6))
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
