import { useContext } from 'react'
import { EnergyPopoverContext } from '../context/EnergyPopoverContext'

interface EnergyPopoverConfig {
  value?: number
  label?: string
  onSave?: (value: number) => void | Promise<void>
  triggerRef?: { current: HTMLElement | null }
  disabled?: boolean
}

interface EnergyPopoverContextValue {
  openEnergyPopover: (config?: EnergyPopoverConfig) => void
  closeEnergyPopover: () => void
}

/**
 * Hook para usar el popover de energía
 */
export function useEnergyPopover() {
  const context = useContext(EnergyPopoverContext) as EnergyPopoverContextValue | null
  if (!context) {
    throw new Error('useEnergyPopover must be used within EnergyPopoverProvider')
  }
  return context
}