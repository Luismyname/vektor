import { useContext } from 'react'
import { EnergyPopoverContext } from '../context/EnergyPopoverContext'

/**
 * Hook para usar el popover de energía
 */
export function useEnergyPopover() {
  const context = useContext(EnergyPopoverContext)
  if (!context) {
    throw new Error('useEnergyPopover must be used within EnergyPopoverProvider')
  }
  return context
}