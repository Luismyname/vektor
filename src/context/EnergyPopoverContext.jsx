import { useCallback, useMemo, useState, createContext } from 'react'
import { EnergyPopover } from '../components/weekly-planner/EnergyPopover'

const EnergyPopoverContext = createContext(null)

export { EnergyPopoverContext }

export function EnergyPopoverProvider({ children }) {
  const [popoverState, setPopoverState] = useState({
    isOpen: false,
    config: null,
  })

  const openEnergyPopover = useCallback((config = {}) => {
    setPopoverState({
      isOpen: true,
      config: {
        value: config.value ?? null,
        label: config.label ?? 'Energía',
        onSave: config.onSave,
        triggerRef: config.triggerRef,
        disabled: config.disabled ?? false,
      },
    })
  }, [])

  const closeEnergyPopover = useCallback(() => {
    setPopoverState({ isOpen: false, config: null })
  }, [])

  const contextValue = useMemo(() => ({
    openEnergyPopover,
    closeEnergyPopover,
  }), [openEnergyPopover, closeEnergyPopover])

  return (
    <EnergyPopoverContext.Provider value={contextValue}>
      {children}
      <EnergyPopoverPortal
        config={popoverState.config}
        isOpen={popoverState.isOpen}
        onClose={closeEnergyPopover}
      />
    </EnergyPopoverContext.Provider>
  )
}

export function EnergyPopoverPortal({ config, isOpen, onClose }) {
  if (!config) return null
  return (
    <EnergyPopover
      isOpen={isOpen}
      {...config}
      onClose={onClose}
    />
  )
}