import { useState, useEffect, useCallback, useMemo } from 'react'
import { recordHabitImpact } from '../../services/energy-impact-engine'

type EnergyCallback = (value: number) => void | Promise<void>

interface EnergySelectorProps {
  value?: number | null
  onChange?: (value: number) => void
  label?: string
  size?: string
  onSave?: EnergyCallback
  disabled?: boolean
}

interface UserEnergySelectorProps {
  userId: string
  onEnergySelect?: (value: number) => void
  disabled?: boolean
}

interface FocusEnergySelectorProps {
  value?: number | null
  onChange?: (value: number) => void
  onSave?: EnergyCallback
  userId: string
  taskId?: string
  focusSessionId?: string
  disabled?: boolean
}

interface HabitEnergySelectorProps {
  userId: string
  habitId: string
  onEnergySelect?: (value: number) => void
  disabled?: boolean
}

/**
 * @deprecated Use the EnergyPopover for planner energy check-ins.
 * Retained for FocusQualityModal until that flow is migrated.
 */
export function EnergySelector({
  value,
  onChange,
  label = 'Energía actual',
  size = 'compact',
  onSave,
  disabled = false,
}: EnergySelectorProps) {
  // Usar value directamente si está definido, sino usar estado local
  const localValue = useMemo(() => value ?? 5, [value])
  const [isOpen, setIsOpen] = useState(false)

  const handleSelect = useCallback(async (newValue: number) => {
    onChange?.(newValue)

    if (onSave) {
      try {
        await onSave(newValue)
      } catch (err) {
        console.error('Error saving energy:', err)
      }
    }

    setIsOpen(false)
  }, [onChange, onSave])

  const handleClickOutside = useCallback((e: globalThis.MouseEvent) => {
    if (isOpen && !(e.target as Element).closest('.energy-selector')) {
      setIsOpen(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, handleClickOutside])

  if (size === 'compact') {
    return (
      <div className="energy-selector energy-selector--compact" onClick={(e) => { e.stopPropagation(); if (!disabled) setIsOpen(true); }}>
        <span className="energy-selector__label">{label}</span>
        <div className="energy-selector__value">
          <span className="energy-selector__dots">
            {[1,2,3,4,5,6,7,8,9,10].map(n => (
              <span
                key={n}
                className={`energy-selector__dot ${localValue >= n ? 'filled' : ''}`}
                aria-label={`Energía ${n}`}
              />
            ))}
          </span>
          <span className="energy-selector__value-text">{localValue}/10</span>
        </div>
        {isOpen && (
          <div className="energy-selector__dropdown" role="listbox" aria-label="Seleccionar energía" onClick={(e) => e.stopPropagation()}>
            {[1,2,3,4,5,6,7,8,9,10].map(n => (
              <button
                key={n}
                role="option"
                aria-selected={localValue === n}
                className={`energy-selector__option ${localValue === n ? 'selected' : ''}`}
                onClick={(e) => { e.stopPropagation(); handleSelect(n); }}
                disabled={disabled}
              >
                {n}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Versión completa (para FocusQualityModal)
  return (
    <div className="energy-selector energy-selector--full" onClick={(e) => e.stopPropagation()}>
      <div className="form-group">
        <label htmlFor="energy-level">{label}</label>
        <div className="energy-selector__slider">
          <input
            type="range"
            min="1"
            max="10"
            value={localValue}
            onChange={(e) => { e.stopPropagation(); onChange?.(Number(e.target.value)); }}
            className="energy-slider"
            disabled={disabled}
          />
          <div className="energy-labels">
            {[1,2,3,4,5,6,7,8,9,10].map(n => (
              <span key={n} className={localValue === n ? 'active' : ''}>
                {n}
              </span>
            ))}
          </div>
          <output className="energy-value">{localValue}/10</output>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => handleSelect(localValue)}
          disabled={disabled}
        >
          Guardar
        </button>
      </div>
    </div>
  )
}

// Componente para TaskBlock - selector inline compacto
export function TaskEnergySelector({ 
  userId, 
  onEnergySelect,
  disabled = false 
}: UserEnergySelectorProps) {
  const [showSelector, setShowSelector] = useState(false)

  const handleSave = async (value: number) => {
    try {
      const { saveEnergyAtTaskStart } = await import('../../services/energy')
      const { error } = await saveEnergyAtTaskStart(userId, value)
      if (error) throw error
      onEnergySelect?.(value)
      setShowSelector(false)
    } catch (err) {
      console.error('Error saving energy:', err)
    }
  }

  return (
    <div className="task-energy-selector" onMouseDown={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="btn-ghost task-energy-trigger"
        onClick={(e) => { e.stopPropagation(); setShowSelector(true); }}
        disabled={disabled}
        aria-label="Registrar energía inicial"
      >
        ⚡ Energía
      </button>
      {showSelector && (
        <div className="task-energy-dropdown" onClick={(e) => e.stopPropagation()}>
          <p className="dropdown-label">Energía inicial (1-10)</p>
          <div className="energy-grid" role="listbox" aria-label="Seleccionar energía inicial">
            {[1,2,3,4,5,6,7,8,9,10].map(n => (
              <button
                key={n}
                role="option"
                className={`energy-option ${n <= 3 ? 'low' : n <= 6 ? 'medium' : 'high'}`}
                onClick={(e) => { e.stopPropagation(); handleSave(n); }}
                disabled={false}
                aria-label={`Energía ${n}`}
              >
                {n}
              </button>
            ))}
          </div>
          <button type="button" className="btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); setShowSelector(false); }}>
            Cancelar
          </button>
        </div>
      )}
    </div>
  )
}

// Componente para FocusQualityModal - selector de energía final
export function FocusEnergySelector({ 
  value, 
  onChange, 
  onSave,
  userId,
  disabled = false 
}: FocusEnergySelectorProps) {
  const [localValue, setLocalValue] = useState(value ?? 5)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const handleSave = async () => {
    setSaving(true)
    setSaveError('')
    try {
      const { saveEnergyAtTaskEnd } = await import('../../services/energy')
      const { error } = await saveEnergyAtTaskEnd(userId, localValue)
      if (error) throw error
      onSave?.(localValue)
      onChange?.(localValue)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'No se pudo guardar la energía.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="form-group">
      <label htmlFor="energy-level-end">⚡ Energía al finalizar (1-10)</label>
      <div className="energy-selector energy-selector--full" onClick={(e) => e.stopPropagation()}>
        <input
          id="energy-level-end"
          type="range"
          min="1"
          max="10"
          value={localValue}
          aria-label="Energía al finalizar (1-10)"
          onChange={(e) => { e.stopPropagation(); setLocalValue(Number(e.target.value)); }}
          className="energy-slider"
          disabled={disabled}
        />
        <div className="energy-labels">
          {[1,2,3,4,5,6,7,8,9,10].map(n => (
            <span key={n} className={localValue === n ? 'active' : ''}>
              {n}
            </span>
          ))}
        </div>
        <output className="energy-value">{localValue}/10</output>
      </div>
      <button
        type="button"
        className="btn-primary btn-sm"
        onClick={(e) => { e.stopPropagation(); handleSave(); }}
        disabled={disabled || saving}
      >
        {saving ? 'Guardando...' : 'Guardar energía'}
      </button>
      {saveError && <p role="alert">{saveError}</p>}
    </div>
  )
}

// Componente para PlannerIncompleteSection - selector compacto para hábitos
export function HabitEnergySelector({ 
  userId, 
  habitId,
  onEnergySelect,
  disabled = false 
}: HabitEnergySelectorProps) {
  const [showSelector, setShowSelector] = useState(false)

  const handleSave = async (value: number) => {
    try {
      const { error } = await recordHabitImpact(userId, habitId, 'finish', value)
      if (error) throw error
      onEnergySelect?.(value)
      setShowSelector(false)
    } catch (err) {
      console.error('Error saving habit energy:', err)
    }
  }

  return (
    <div className="habit-energy-selector" onMouseDown={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="btn-ghost habit-energy-trigger"
        onClick={(e) => { e.stopPropagation(); setShowSelector(true); }}
        disabled={disabled}
        aria-label="Registrar energía al completar"
      >
        ⚡ Energía
      </button>
      {showSelector && (
        <div className="habit-energy-dropdown" onClick={(e) => e.stopPropagation()}>
          <p className="dropdown-label">Energía al completar (1-10)</p>
          <div className="energy-grid" role="listbox" aria-label="Seleccionar energía">
            {[1,2,3,4,5,6,7,8,9,10].map(n => (
              <button
                key={n}
                role="option"
                className={`energy-option ${n <= 3 ? 'low' : n <= 6 ? 'medium' : 'high'}`}
                onClick={(e) => { e.stopPropagation(); handleSave(n); }}
                disabled={false}
                aria-label={`Energía ${n}`}
              >
                {n}
              </button>
            ))}
          </div>
          <button type="button" className="btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); setShowSelector(false); }}>
            Cancelar
          </button>
        </div>
      )}
    </div>
  )
}